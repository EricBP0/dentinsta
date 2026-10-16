import { enviarConviteDeSenha } from "@/lib/conta";
import { atualizarValorAssinatura, cancelarAssinaturaAsaas } from "@/lib/pagamento/asaas";
import { processarEvento, tokenValido, type AssinaturaRef, type EventoAsaas } from "@/lib/pagamento/webhook";
import { PLANOS, type Plano } from "@/lib/planos";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Webhook do Asaas. Configure no painel do Asaas (Integrações → Webhooks) com a
// URL https://SEU-SITE/api/asaas/webhook e o mesmo token de ASAAS_WEBHOOK_TOKEN.
// Eventos usados: CHECKOUT_*, PAYMENT_CONFIRMED, PAYMENT_RECEIVED,
// PAYMENT_REFUNDED, PAYMENT_CHARGEBACK_REQUESTED, SUBSCRIPTION_DELETED,
// SUBSCRIPTION_INACTIVATED e, para o Pix dos afiliados, TRANSFER_DONE,
// TRANSFER_FAILED e TRANSFER_CANCELLED.

type EventoTransferencia = { transfer?: { id: string; status?: string; failReason?: string | null } };

/** Pix dos saques de afiliados (TRANSFER_DONE, TRANSFER_FAILED, TRANSFER_CANCELLED). */
async function tratarTransferencia(admin: ReturnType<typeof criarClienteAdmin>, evento: { id: string; event: string } & EventoTransferencia) {
  const transferencia = evento.transfer;
  if (!transferencia?.id) return Response.json({ ok: true, acao: "ignorado" });
  const { data: saque } = await admin
    .from("saques")
    .select("id")
    .eq("transferencia_id", transferencia.id)
    .maybeSingle<{ id: string }>();
  if (!saque) return Response.json({ ok: true, acao: "saque_nao_encontrado" });

  let acao = "ignorado";
  if (evento.event === "TRANSFER_DONE") {
    const { error } = await admin.rpc("concluir_saque", { p_saque_id: saque.id, p_transferencia_id: transferencia.id });
    if (error) return new Response("erro", { status: 500 });
    acao = "saque_pago";
  } else if (evento.event === "TRANSFER_FAILED" || evento.event === "TRANSFER_CANCELLED") {
    const motivo = `Pix ${evento.event === "TRANSFER_FAILED" ? "falhou" : "cancelado"} no Asaas${transferencia.failReason ? `: ${transferencia.failReason}` : ""}`;
    const { error } = await admin.rpc("falhar_saque", { p_saque_id: saque.id, p_motivo: motivo });
    if (error) return new Response("erro", { status: 500 });
    acao = "saque_falhou";
  }
  await admin
    .from("webhook_eventos")
    .upsert({ id: evento.id, gateway: "asaas", evento: evento.event, payload: evento }, { ignoreDuplicates: true });
  return Response.json({ ok: true, acao, saqueId: saque.id });
}

/**
 * Mensal com cupom: o desconto vale só na 1ª cobrança. Depois dela, a
 * assinatura no Asaas volta ao preço cheio (uma vez; a marcação é atômica).
 */
async function restaurarPrecoCheio(admin: ReturnType<typeof criarClienteAdmin>, assinaturaId: string) {
  const { data } = await admin
    .from("assinaturas")
    .update({ valor_restaurado_em: new Date().toISOString() })
    .eq("id", assinaturaId)
    .eq("ciclo", "mensal")
    .gt("desconto_centavos", 0)
    .is("valor_restaurado_em", null)
    .not("gateway_assinatura_id", "is", null)
    .select("gateway_assinatura_id, valor_centavos, plano")
    .maybeSingle<{ gateway_assinatura_id: string; valor_centavos: number; plano: Plano }>();
  if (!data) return;
  try {
    await atualizarValorAssinatura(data.gateway_assinatura_id, data.valor_centavos, `OdontoLab ${PLANOS[data.plano].nome}`);
  } catch (erro) {
    // Desfaz a marcação: o próximo pagamento confirmado tenta de novo.
    console.error("Falha ao voltar a assinatura ao preço cheio", { assinaturaId, erro });
    await admin.from("assinaturas").update({ valor_restaurado_em: null }).eq("id", assinaturaId);
  }
}

export async function POST(request: Request) {
  if (!tokenValido(request.headers.get("asaas-access-token"), process.env.ASAAS_WEBHOOK_TOKEN)) {
    return new Response("não autorizado", { status: 401 });
  }

  let evento: EventoAsaas;
  try {
    evento = await request.json();
  } catch {
    return new Response("json inválido", { status: 400 });
  }
  if (!evento?.id || !evento?.event) return new Response("evento inválido", { status: 400 });

  const admin = criarClienteAdmin();
  if (evento.event.startsWith("TRANSFER_")) return tratarTransferencia(admin, evento as EventoAsaas & EventoTransferencia);
  type Linha = {
    id: string;
    ciclo: "mensal" | "anual";
    status: string;
    valor_centavos: number;
    checkout_id: string | null;
    gateway_assinatura_id: string | null;
    desconto_centavos: number;
  };
  const buscar = async (coluna: string, valor: string): Promise<AssinaturaRef | null> => {
    const { data } = await admin
      .from("assinaturas")
      .select("id, ciclo, status, valor_centavos, checkout_id, gateway_assinatura_id, desconto_centavos")
      .eq(coluna, valor)
      .maybeSingle<Linha>();
    return data
      ? {
          id: data.id,
          ciclo: data.ciclo,
          status: data.status,
          // Anual com cupom: o pagamento único já veio com o desconto.
          valorCentavos: data.ciclo === "anual" ? data.valor_centavos - data.desconto_centavos : data.valor_centavos,
          checkoutId: data.checkout_id,
          gatewayAssinaturaId: data.gateway_assinatura_id,
        }
      : null;
  };
  const atualizar = async (id: string, campos: Record<string, unknown>, statusAtual?: string) => {
    let consulta = admin.from("assinaturas").update({ ...campos, atualizado_em: new Date().toISOString() }).eq("id", id);
    if (statusAtual) consulta = consulta.eq("status", statusAtual);
    const { error } = await consulta;
    if (error) throw error;
  };

  try {
    const resultado = await processarEvento(evento, {
      buscarPorId: (id) => buscar("id", id),
      buscarPorCheckout: (id) => buscar("checkout_id", id),
      buscarPorGateway: (id) => buscar("gateway_assinatura_id", id),
      confirmar: async (p) => {
        const { error } = await admin.rpc("confirmar_pagamento_assinatura", {
          p_assinatura_id: p.assinaturaId,
          p_chave_pagamento: p.chavePagamento,
          p_valor_centavos: p.valorCentavos,
          p_parcelas: p.parcelas,
          p_gateway_assinatura_id: p.gatewayAssinaturaId,
          p_gateway_cliente_id: p.clienteId,
        });
        if (error) throw error;
      },
      estornar: async (id, chave, status) => {
        const { error } = await admin.rpc("estornar_assinatura", {
          p_assinatura_id: id,
          p_chave_pagamento: chave,
          p_status: status,
        });
        if (error) throw error;
      },
      encerrarPendente: (id) => atualizar(id, { status: "encerrada" }, "pendente"),
      marcarCancelada: (id) => atualizar(id, { status: "cancelada", cancelada_em: new Date().toISOString() }, "ativa"),
      cancelarNoGateway: async (gatewayId) => {
        // Já cancelada no Asaas não é erro: o importante é parar de cobrar.
        await cancelarAssinaturaAsaas(gatewayId).catch((erro) =>
          console.error("Falha ao cancelar assinatura no Asaas", { gatewayId, erro }),
        );
      },
    });

    // Registro para auditoria. Reentregas do mesmo evento são seguras: a
    // confirmação é idempotente pela chave do pagamento.
    await admin
      .from("webhook_eventos")
      .upsert({ id: evento.id, gateway: "asaas", evento: evento.event, payload: evento }, { ignoreDuplicates: true });

    // Conta criada no pagamento: o 1º pagamento confirmado manda o e-mail "crie
    // sua senha" (uma vez só). Falha aqui não pode fazer o Asaas reenviar o evento.
    if (resultado.acao === "confirmada" && resultado.assinaturaId) {
      await enviarConviteDeSenha(resultado.assinaturaId).catch((erro) =>
        console.error("Falha ao enviar o convite de senha", { assinaturaId: resultado.assinaturaId, erro }),
      );
      await restaurarPrecoCheio(admin, resultado.assinaturaId);
    }

    return Response.json({ ok: true, ...resultado });
  } catch (erro) {
    console.error("Falha ao processar webhook do Asaas", { evento: evento.event, id: evento.id, erro });
    // 500 faz o Asaas tentar de novo.
    return new Response("erro", { status: 500 });
  }
}
