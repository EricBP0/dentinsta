import { cancelarAssinaturaAsaas } from "@/lib/pagamento/asaas";
import { processarEvento, tokenValido, type AssinaturaRef, type EventoAsaas } from "@/lib/pagamento/webhook";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Webhook do Asaas. Configure no painel do Asaas (Integrações → Webhooks) com a
// URL https://SEU-SITE/api/asaas/webhook e o mesmo token de ASAAS_WEBHOOK_TOKEN.
// Eventos usados: CHECKOUT_*, PAYMENT_CONFIRMED, PAYMENT_RECEIVED,
// PAYMENT_REFUNDED, PAYMENT_CHARGEBACK_REQUESTED, SUBSCRIPTION_DELETED e
// SUBSCRIPTION_INACTIVATED.
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
  type Linha = {
    id: string;
    ciclo: "mensal" | "anual";
    status: string;
    valor_centavos: number;
    checkout_id: string | null;
    gateway_assinatura_id: string | null;
  };
  const buscar = async (coluna: string, valor: string): Promise<AssinaturaRef | null> => {
    const { data } = await admin
      .from("assinaturas")
      .select("id, ciclo, status, valor_centavos, checkout_id, gateway_assinatura_id")
      .eq(coluna, valor)
      .maybeSingle<Linha>();
    return data
      ? {
          id: data.id,
          ciclo: data.ciclo,
          status: data.status,
          valorCentavos: data.valor_centavos,
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

    return Response.json({ ok: true, ...resultado });
  } catch (erro) {
    console.error("Falha ao processar webhook do Asaas", { evento: evento.event, id: evento.id, erro });
    // 500 faz o Asaas tentar de novo.
    return new Response("erro", { status: 500 });
  }
}
