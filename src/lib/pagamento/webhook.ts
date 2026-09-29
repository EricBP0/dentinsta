// Processamento dos webhooks do Asaas. As dependências (banco) são injetadas
// para o fluxo poder ser testado sem Supabase.

import { timingSafeEqual } from "node:crypto";

export type EventoAsaas = {
  id: string;
  event: string;
  checkout?: { id: string; customer?: string | null; status?: string };
  payment?: {
    id: string;
    customer?: string | null;
    checkoutSession?: string | null;
    externalReference?: string | null;
    status?: string;
  };
};

export type CompraRef = { id: string; status: string };

export type DependenciasWebhook = {
  buscarCompraPorCheckout(checkoutId: string): Promise<CompraRef | null>;
  buscarCompraPorId(compraId: string): Promise<CompraRef | null>;
  /** Compra paga mais recente de um cliente do Asaas (para estornos sem checkout). */
  buscarCompraPagaPorCliente(clienteId: string): Promise<CompraRef | null>;
  confirmar(compraId: string, clienteId: string | null): Promise<void>;
  estornar(compraId: string, status: "reembolsado" | "contestado"): Promise<void>;
  encerrar(compraId: string, status: "cancelado" | "expirado"): Promise<void>;
};

export type ResultadoWebhook = { acao: string; compraId?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Compara o token do cabeçalho asaas-access-token sem vazar tempo de comparação. */
export function tokenValido(recebido: string | null, esperado: string | undefined): boolean {
  if (!recebido || !esperado) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function compraDoPagamento(
  pagamento: NonNullable<EventoAsaas["payment"]>,
  deps: DependenciasWebhook,
  fallbackCliente: boolean,
) {
  if (pagamento.checkoutSession) {
    const compra = await deps.buscarCompraPorCheckout(pagamento.checkoutSession);
    if (compra) return compra;
  }
  if (pagamento.externalReference && UUID.test(pagamento.externalReference)) {
    const compra = await deps.buscarCompraPorId(pagamento.externalReference);
    if (compra) return compra;
  }
  if (fallbackCliente && pagamento.customer) return deps.buscarCompraPagaPorCliente(pagamento.customer);
  return null;
}

export async function processarEvento(evento: EventoAsaas, deps: DependenciasWebhook): Promise<ResultadoWebhook> {
  switch (evento.event) {
    case "CHECKOUT_PAID": {
      if (!evento.checkout) return { acao: "ignorado" };
      const compra = await deps.buscarCompraPorCheckout(evento.checkout.id);
      if (!compra) return { acao: "compra_nao_encontrada" };
      await deps.confirmar(compra.id, evento.checkout.customer ?? null);
      return { acao: "confirmada", compraId: compra.id };
    }

    case "CHECKOUT_CANCELED":
    case "CHECKOUT_EXPIRED": {
      if (!evento.checkout) return { acao: "ignorado" };
      const compra = await deps.buscarCompraPorCheckout(evento.checkout.id);
      if (!compra || compra.status !== "pendente") return { acao: "ignorado" };
      await deps.encerrar(compra.id, evento.event === "CHECKOUT_EXPIRED" ? "expirado" : "cancelado");
      return { acao: "encerrada", compraId: compra.id };
    }

    // Redundância: se o pagamento vier ligado ao checkout, também confirma (é idempotente).
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED": {
      if (!evento.payment) return { acao: "ignorado" };
      const compra = await compraDoPagamento(evento.payment, deps, false);
      if (!compra) return { acao: "ignorado" };
      await deps.confirmar(compra.id, evento.payment.customer ?? null);
      return { acao: "confirmada", compraId: compra.id };
    }

    case "PAYMENT_REFUNDED":
    case "PAYMENT_CHARGEBACK_REQUESTED": {
      if (!evento.payment) return { acao: "ignorado" };
      const compra = await compraDoPagamento(evento.payment, deps, true);
      if (!compra) return { acao: "compra_nao_encontrada" };
      await deps.estornar(compra.id, evento.event === "PAYMENT_REFUNDED" ? "reembolsado" : "contestado");
      return { acao: "estornada", compraId: compra.id };
    }

    default:
      return { acao: "ignorado" };
  }
}
