import { processarEvento, tokenValido, type CompraRef, type EventoAsaas } from "@/lib/pagamento/webhook";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Webhook do Asaas. Configure no painel do Asaas (Integrações → Webhooks) com a
// URL https://SEU-SITE/api/asaas/webhook e o mesmo token de ASAAS_WEBHOOK_TOKEN.
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
  const buscar = async (coluna: string, valor: string) => {
    const { data } = await admin.from("compras").select("id, status").eq(coluna, valor).maybeSingle<CompraRef>();
    return data;
  };

  try {
    const resultado = await processarEvento(evento, {
      buscarCompraPorCheckout: (id) => buscar("checkout_id", id),
      buscarCompraPorId: (id) => buscar("id", id),
      buscarCompraPagaPorCliente: async (cliente) => {
        const { data } = await admin
          .from("compras")
          .select("id, status")
          .eq("gateway_cliente_id", cliente)
          .eq("status", "pago")
          .order("pago_em", { ascending: false })
          .limit(1)
          .maybeSingle<CompraRef>();
        return data;
      },
      confirmar: async (compraId, clienteId) => {
        const { error } = await admin.rpc("confirmar_compra", {
          p_compra_id: compraId,
          p_gateway_cliente_id: clienteId,
        });
        if (error) throw error;
      },
      estornar: async (compraId, status) => {
        const { error } = await admin.rpc("estornar_compra", { p_compra_id: compraId, p_status: status });
        if (error) throw error;
      },
      encerrar: async (compraId, status) => {
        const { error } = await admin
          .from("compras")
          .update({ status, atualizado_em: new Date().toISOString() })
          .eq("id", compraId)
          .eq("status", "pendente");
        if (error) throw error;
      },
    });

    // Registro para auditoria. Reentregas do mesmo evento são seguras: as
    // funções de confirmação e estorno são idempotentes.
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
