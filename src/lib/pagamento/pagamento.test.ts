import { describe, expect, it } from "vitest";
import { montarEscolha } from "@/lib/planos";
import { dataAsaas, montarCheckoutAssinatura } from "./ofertas";
import { processarEvento, tokenValido, type AssinaturaRef, type DependenciasWebhook } from "./webhook";

const agora = new Date("2026-10-09T15:00:00Z");

describe("montarCheckoutAssinatura", () => {
  it("mensal: recorrente no cartão, primeira cobrança hoje", () => {
    const corpo = montarCheckoutAssinatura({
      escolha: montarEscolha("essencial", "mensal", ["chat"])!,
      assinaturaId: "a1",
      urlBase: "https://site.com",
      agora,
    });
    expect(corpo.billingTypes).toEqual(["CREDIT_CARD"]);
    expect(corpo.chargeTypes).toEqual(["RECURRENT"]);
    expect(corpo).toMatchObject({ subscription: { cycle: "MONTHLY", nextDueDate: "2026-10-09 12:00:00" } });
    expect(corpo.items[0].value).toBe(49.8);
    expect(corpo.items[0].description).toBe("Assinatura mensal: Disciplinas, Chat IA");
    expect(corpo.externalReference).toBe("a1");
    expect(corpo.callback.successUrl).toBe("https://site.com/pagamento/concluido?assinatura=a1");
  });

  it("anual à vista: Pix ou cartão, pagamento único", () => {
    const corpo = montarCheckoutAssinatura({
      escolha: montarEscolha("completo", "anual")!,
      assinaturaId: "a2",
      urlBase: "https://s",
      modalidadeAnual: "a_vista",
    });
    expect(corpo.billingTypes).toEqual(["PIX", "CREDIT_CARD"]);
    expect(corpo.chargeTypes).toEqual(["DETACHED"]);
    expect(corpo).not.toHaveProperty("subscription");
    expect(corpo.items[0].value).toBe(418.8);
  });

  it("anual parcelado: cartão em até 12x", () => {
    const corpo = montarCheckoutAssinatura({
      escolha: montarEscolha("duplo", "anual")!,
      assinaturaId: "a3",
      urlBase: "https://s",
      modalidadeAnual: "parcelado",
    });
    expect(corpo).toMatchObject({ chargeTypes: ["INSTALLMENT"], installment: { maxInstallmentCount: 12 } });
    expect(corpo.items[0].value).toBe(718.8);
    expect(corpo.items[0].name.length).toBeLessThanOrEqual(30);
  });

  it("data no formato e fuso que o Asaas espera", () => {
    expect(dataAsaas(new Date("2026-01-01T02:30:00Z"))).toBe("2025-12-31 23:30:00");
  });
});

describe("tokenValido", () => {
  it("aceita só o token exato", () => {
    expect(tokenValido("segredo", "segredo")).toBe(true);
    expect(tokenValido("segredX", "segredo")).toBe(false);
    expect(tokenValido("curto", "segredo")).toBe(false);
    expect(tokenValido(null, "segredo")).toBe(false);
    expect(tokenValido("qualquer", undefined)).toBe(false);
  });
});

const ID_MENSAL = "11111111-1111-4111-8111-111111111111";
const ID_ANUAL = "22222222-2222-4222-8222-222222222222";

function fakeDeps() {
  const assinaturas: AssinaturaRef[] = [
    { id: ID_MENSAL, ciclo: "mensal", status: "pendente", valorCentavos: 3490, checkoutId: "chk_m", gatewayAssinaturaId: null },
    { id: ID_ANUAL, ciclo: "anual", status: "pendente", valorCentavos: 34900, checkoutId: "chk_a", gatewayAssinaturaId: null },
  ];
  const chaves = new Set<string>();
  const log: string[] = [];
  const deps: DependenciasWebhook = {
    buscarPorId: async (id) => assinaturas.find((a) => a.id === id) ?? null,
    buscarPorCheckout: async (id) => assinaturas.find((a) => a.checkoutId === id) ?? null,
    buscarPorGateway: async (id) => assinaturas.find((a) => a.gatewayAssinaturaId === id) ?? null,
    // Igual ao banco: a mesma chave não estende duas vezes.
    confirmar: async (p) => {
      if (chaves.has(p.chavePagamento)) return;
      chaves.add(p.chavePagamento);
      const a = assinaturas.find((x) => x.id === p.assinaturaId)!;
      a.status = "ativa";
      a.gatewayAssinaturaId ??= p.gatewayAssinaturaId;
      log.push(`confirmar ${a.ciclo} ${p.valorCentavos}`);
    },
    estornar: async (id, chave, status) => void log.push(`estornar ${id === ID_ANUAL ? "anual" : "mensal"} ${chave} ${status}`),
    encerrarPendente: async (id) => void log.push(`encerrar ${id === ID_ANUAL ? "anual" : "mensal"}`),
    marcarCancelada: async () => void log.push("cancelada"),
    cancelarNoGateway: async (id) => void log.push(`cancelar no Asaas ${id}`),
  };
  return { deps, log, assinaturas };
}

describe("processarEvento", () => {
  it("mensal: o checkout pago espera a cobrança; cada cobrança conta uma vez", async () => {
    const { deps, log } = fakeDeps();
    expect(await processarEvento({ id: "e1", event: "CHECKOUT_PAID", checkout: { id: "chk_m" } }, deps)).toMatchObject({
      acao: "aguardando_pagamento",
    });
    const primeira = { id: "pay_1", checkoutSession: "chk_m", subscription: "sub_1", value: 34.9 };
    await processarEvento({ id: "e2", event: "PAYMENT_CONFIRMED", payment: primeira }, deps);
    await processarEvento({ id: "e3", event: "PAYMENT_RECEIVED", payment: primeira }, deps);
    // Mês seguinte: chega só com o id da assinatura do Asaas.
    await processarEvento({ id: "e4", event: "PAYMENT_CONFIRMED", payment: { id: "pay_2", subscription: "sub_1", value: 34.9 } }, deps);
    expect(log).toEqual(["confirmar mensal 3490", "confirmar mensal 3490"]);
  });

  it("anual: checkout pago e as 12 parcelas liberam uma vez só", async () => {
    const { deps, log } = fakeDeps();
    await processarEvento({ id: "e1", event: "CHECKOUT_PAID", checkout: { id: "chk_a" } }, deps);
    for (let i = 1; i <= 12; i++) {
      await processarEvento(
        { id: `p${i}`, event: "PAYMENT_CONFIRMED", payment: { id: `pay_${i}`, checkoutSession: "chk_a", installment: "ins_1", value: 49.9 } },
        deps,
      );
    }
    expect(log).toEqual(["confirmar anual 34900"]);
  });

  it("acha a assinatura pela nossa referência", async () => {
    const { deps, log } = fakeDeps();
    await processarEvento({ id: "e1", event: "PAYMENT_RECEIVED", payment: { id: "pix_1", externalReference: ID_ANUAL } }, deps);
    expect(log).toEqual(["confirmar anual 34900"]);
  });

  it("estorno corta o acesso e para a cobrança no Asaas", async () => {
    const { deps, log } = fakeDeps();
    await processarEvento({ id: "e1", event: "PAYMENT_CONFIRMED", payment: { id: "pay_1", checkoutSession: "chk_m", subscription: "sub_1" } }, deps);
    await processarEvento({ id: "e2", event: "PAYMENT_CHARGEBACK_REQUESTED", payment: { id: "pay_1", subscription: "sub_1" } }, deps);
    expect(log.slice(1)).toEqual(["estornar mensal pagamento:pay_1 contestado", "cancelar no Asaas sub_1"]);
  });

  it("checkout abandonado encerra só assinatura pendente", async () => {
    const { deps, log, assinaturas } = fakeDeps();
    await processarEvento({ id: "e1", event: "CHECKOUT_EXPIRED", checkout: { id: "chk_m" } }, deps);
    assinaturas[1].status = "ativa";
    await processarEvento({ id: "e2", event: "CHECKOUT_CANCELED", checkout: { id: "chk_a" } }, deps);
    expect(log).toEqual(["encerrar mensal"]);
  });

  it("assinatura apagada no Asaas fica cancelada (vale até o fim do período)", async () => {
    const { deps, log } = fakeDeps();
    await processarEvento({ id: "e1", event: "PAYMENT_CONFIRMED", payment: { id: "pay_1", checkoutSession: "chk_m", subscription: "sub_1" } }, deps);
    await processarEvento({ id: "e2", event: "SUBSCRIPTION_DELETED", subscription: { id: "sub_1" } }, deps);
    expect(log).toEqual(["confirmar mensal 3490", "cancelada"]);
  });

  it("ignora eventos desconhecidos ou de outras cobranças", async () => {
    const { deps, log } = fakeDeps();
    expect((await processarEvento({ id: "e1", event: "PAYMENT_CREATED", payment: { id: "x" } }, deps)).acao).toBe("ignorado");
    expect((await processarEvento({ id: "e2", event: "PAYMENT_CONFIRMED", payment: { id: "x" } }, deps)).acao).toBe("ignorado");
    expect(log).toEqual([]);
  });
});
