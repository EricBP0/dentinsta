// Processamento dos webhooks do Asaas para as assinaturas. As dependências
// (banco e API) são injetadas para o fluxo poder ser testado sem Supabase.
//
// O acesso só depende de pagamentos confirmados: cada um estende o período;
// sem pagamento, o acesso vence sozinho (fim do período + tolerância). Assim
// não dependemos de eventos de cancelamento ou atraso, que podem não chegar.

import { timingSafeEqual } from "node:crypto";

export type EventoAsaas = {
  id: string;
  event: string;
  checkout?: { id: string; customer?: string | null; status?: string; externalReference?: string | null };
  payment?: {
    id: string;
    customer?: string | null;
    checkoutSession?: string | null;
    externalReference?: string | null;
    subscription?: string | null;
    installment?: string | null;
    value?: number | null;
    status?: string;
  };
  subscription?: { id: string; externalReference?: string | null };
};

export type AssinaturaRef = {
  id: string;
  ciclo: "mensal" | "anual";
  status: string;
  valorCentavos: number;
  checkoutId: string | null;
  gatewayAssinaturaId: string | null;
};

export type DependenciasWebhook = {
  buscarPorId(id: string): Promise<AssinaturaRef | null>;
  buscarPorCheckout(checkoutId: string): Promise<AssinaturaRef | null>;
  buscarPorGateway(gatewayAssinaturaId: string): Promise<AssinaturaRef | null>;
  confirmar(params: {
    assinaturaId: string;
    chavePagamento: string;
    valorCentavos: number;
    parcelas: number;
    gatewayAssinaturaId: string | null;
    clienteId: string | null;
  }): Promise<void>;
  estornar(assinaturaId: string, chavePagamento: string | null, status: "reembolsado" | "contestado"): Promise<void>;
  /** Checkout abandonado: a assinatura pendente vira encerrada. */
  encerrarPendente(assinaturaId: string): Promise<void>;
  /** Cancelada no Asaas: não renova, mas vale até o fim do período pago. */
  marcarCancelada(assinaturaId: string): Promise<void>;
  /** Para de cobrar no Asaas (depois de estorno ou chargeback). */
  cancelarNoGateway(gatewayAssinaturaId: string): Promise<void>;
};

export type ResultadoWebhook = { acao: string; assinaturaId?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Compara o token do cabeçalho asaas-access-token sem vazar tempo de comparação. */
export function tokenValido(recebido: string | null, esperado: string | undefined): boolean {
  if (!recebido || !esperado) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Acha a assinatura de um pagamento: nossa referência, a assinatura do Asaas ou o checkout. */
async function assinaturaDoPagamento(pagamento: NonNullable<EventoAsaas["payment"]>, deps: DependenciasWebhook) {
  if (pagamento.externalReference && UUID.test(pagamento.externalReference)) {
    const a = await deps.buscarPorId(pagamento.externalReference);
    if (a) return a;
  }
  if (pagamento.subscription) {
    const a = await deps.buscarPorGateway(pagamento.subscription);
    if (a) return a;
  }
  if (pagamento.checkoutSession) return deps.buscarPorCheckout(pagamento.checkoutSession);
  return null;
}

/**
 * Chave que torna a confirmação idempotente. Mensal: cada cobrança do mês.
 * Anual: o checkout inteiro (as 12 parcelas e o CHECKOUT_PAID contam uma vez).
 */
function chaveDoAnual(assinatura: AssinaturaRef, checkoutId?: string | null) {
  return `checkout:${checkoutId ?? assinatura.checkoutId ?? assinatura.id}`;
}

export async function processarEvento(evento: EventoAsaas, deps: DependenciasWebhook): Promise<ResultadoWebhook> {
  switch (evento.event) {
    // Anual: o checkout pago libera os 12 meses. Mensal: espera o pagamento
    // (PAYMENT_CONFIRMED), que traz o id da cobrança e da assinatura.
    case "CHECKOUT_PAID": {
      if (!evento.checkout) return { acao: "ignorado" };
      const assinatura = await deps.buscarPorCheckout(evento.checkout.id);
      if (!assinatura) return { acao: "assinatura_nao_encontrada" };
      if (assinatura.ciclo === "mensal") return { acao: "aguardando_pagamento", assinaturaId: assinatura.id };
      await deps.confirmar({
        assinaturaId: assinatura.id,
        chavePagamento: chaveDoAnual(assinatura, evento.checkout.id),
        valorCentavos: assinatura.valorCentavos,
        parcelas: 1,
        gatewayAssinaturaId: null,
        clienteId: evento.checkout.customer ?? null,
      });
      return { acao: "confirmada", assinaturaId: assinatura.id };
    }

    case "CHECKOUT_CANCELED":
    case "CHECKOUT_EXPIRED": {
      if (!evento.checkout) return { acao: "ignorado" };
      const assinatura = await deps.buscarPorCheckout(evento.checkout.id);
      if (!assinatura || assinatura.status !== "pendente") return { acao: "ignorado" };
      await deps.encerrarPendente(assinatura.id);
      return { acao: "encerrada", assinaturaId: assinatura.id };
    }

    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED": {
      if (!evento.payment) return { acao: "ignorado" };
      const assinatura = await assinaturaDoPagamento(evento.payment, deps);
      if (!assinatura) return { acao: "ignorado" };
      const anual = assinatura.ciclo === "anual";
      await deps.confirmar({
        assinaturaId: assinatura.id,
        chavePagamento: anual ? chaveDoAnual(assinatura, evento.payment.checkoutSession) : `pagamento:${evento.payment.id}`,
        valorCentavos:
          anual || evento.payment.value == null ? assinatura.valorCentavos : Math.round(evento.payment.value * 100),
        parcelas: 1,
        gatewayAssinaturaId: evento.payment.subscription ?? null,
        clienteId: evento.payment.customer ?? null,
      });
      return { acao: "confirmada", assinaturaId: assinatura.id };
    }

    case "PAYMENT_REFUNDED":
    case "PAYMENT_CHARGEBACK_REQUESTED": {
      if (!evento.payment) return { acao: "ignorado" };
      const assinatura = await assinaturaDoPagamento(evento.payment, deps);
      if (!assinatura) return { acao: "assinatura_nao_encontrada" };
      await deps.estornar(
        assinatura.id,
        assinatura.ciclo === "anual" ? null : `pagamento:${evento.payment.id}`,
        evento.event === "PAYMENT_REFUNDED" ? "reembolsado" : "contestado",
      );
      const gateway = assinatura.gatewayAssinaturaId ?? evento.payment.subscription;
      if (gateway) await deps.cancelarNoGateway(gateway);
      return { acao: "estornada", assinaturaId: assinatura.id };
    }

    case "SUBSCRIPTION_DELETED":
    case "SUBSCRIPTION_INACTIVATED": {
      if (!evento.subscription) return { acao: "ignorado" };
      const assinatura =
        (await deps.buscarPorGateway(evento.subscription.id)) ??
        (evento.subscription.externalReference && UUID.test(evento.subscription.externalReference)
          ? await deps.buscarPorId(evento.subscription.externalReference)
          : null);
      if (!assinatura || assinatura.status !== "ativa") return { acao: "ignorado" };
      await deps.marcarCancelada(assinatura.id);
      return { acao: "cancelada", assinaturaId: assinatura.id };
    }

    default:
      return { acao: "ignorado" };
  }
}
