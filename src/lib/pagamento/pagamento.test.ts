import { afterEach, describe, expect, it, vi } from "vitest";
import { montarCheckout, obterOferta } from "./ofertas";
import { processarEvento, tokenValido, type CompraRef, type DependenciasWebhook } from "./webhook";

describe("ofertas", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("compra à vista: R$ 297,90 no Pix ou cartão 1x", () => {
    const oferta = obterOferta("compra", "a_vista")!;
    const corpo = montarCheckout({ oferta, compraId: "c1", urlBase: "https://site.com" });
    expect(corpo.billingTypes).toEqual(["PIX", "CREDIT_CARD"]);
    expect(corpo.chargeTypes).toEqual(["DETACHED"]);
    expect(corpo.items[0].value).toBe(297.9);
    expect(corpo).not.toHaveProperty("installment");
    expect(corpo.externalReference).toBe("c1");
    expect(corpo.callback.successUrl).toBe("https://site.com/pagamento/concluido?compra=c1");
  });

  it("compra parcelada: R$ 394,80 só no cartão, até 12x", () => {
    const corpo = montarCheckout({ oferta: obterOferta("compra", "parcelado")!, compraId: "c1", urlBase: "https://site.com" });
    expect(corpo.billingTypes).toEqual(["CREDIT_CARD"]);
    expect(corpo.chargeTypes).toEqual(["INSTALLMENT"]);
    expect(corpo.installment).toEqual({ maxInstallmentCount: 12 });
    expect(corpo.items[0].value).toBe(394.8);
    expect(corpo.items[0].imageBase64.length).toBeGreaterThan(100);
  });

  it("renovação fica desligada até o preço ser configurado", () => {
    expect(obterOferta("renovacao", "a_vista")).toBeNull();
    vi.stubEnv("PRECO_RENOVACAO_A_VISTA_CENTAVOS", "19790");
    vi.stubEnv("PRECO_RENOVACAO_PARCELADO_CENTAVOS", "23880");
    expect(obterOferta("renovacao", "parcelado")).toMatchObject({ valorCentavos: 23880, parcelas: 12 });
    const corpo = montarCheckout({ oferta: obterOferta("renovacao", "a_vista")!, compraId: "c2", urlBase: "https://s" });
    expect(corpo.callback.cancelUrl).toBe("https://s/renovar?cancelado=1");
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

function fakeDeps(compras: (CompraRef & { checkout?: string; cliente?: string })[]) {
  const chamadas: string[] = [];
  const deps: DependenciasWebhook = {
    buscarCompraPorCheckout: async (id) => compras.find((c) => c.checkout === id) ?? null,
    buscarCompraPorId: async (id) => compras.find((c) => c.id === id) ?? null,
    buscarCompraPagaPorCliente: async (cliente) =>
      compras.find((c) => c.cliente === cliente && c.status === "pago") ?? null,
    confirmar: async (id, cliente) => void chamadas.push(`confirmar:${id}:${cliente}`),
    estornar: async (id, status) => void chamadas.push(`estornar:${id}:${status}`),
    encerrar: async (id, status) => void chamadas.push(`encerrar:${id}:${status}`),
  };
  return { deps, chamadas };
}

describe("processarEvento", () => {
  const compraId = "5f0c7a52-3b1e-4c1a-9b7e-2d6f1a0e9c11";

  it("CHECKOUT_PAID confirma a compra do checkout", async () => {
    const { deps, chamadas } = fakeDeps([{ id: compraId, status: "pendente", checkout: "chk_1" }]);
    const r = await processarEvento({ id: "evt", event: "CHECKOUT_PAID", checkout: { id: "chk_1", customer: "cus_9" } }, deps);
    expect(r).toEqual({ acao: "confirmada", compraId });
    expect(chamadas).toEqual([`confirmar:${compraId}:cus_9`]);
  });

  it("checkout desconhecido não faz nada", async () => {
    const { deps, chamadas } = fakeDeps([]);
    const r = await processarEvento({ id: "evt", event: "CHECKOUT_PAID", checkout: { id: "x" } }, deps);
    expect(r.acao).toBe("compra_nao_encontrada");
    expect(chamadas).toEqual([]);
  });

  it("checkout expirado encerra só compra pendente", async () => {
    const { deps, chamadas } = fakeDeps([
      { id: "a", status: "pendente", checkout: "chk_a" },
      { id: "b", status: "pago", checkout: "chk_b" },
    ]);
    await processarEvento({ id: "1", event: "CHECKOUT_EXPIRED", checkout: { id: "chk_a" } }, deps);
    await processarEvento({ id: "2", event: "CHECKOUT_EXPIRED", checkout: { id: "chk_b" } }, deps);
    expect(chamadas).toEqual(["encerrar:a:expirado"]);
  });

  it("estorno encontra a compra pelo checkout, pela referência ou pelo cliente", async () => {
    const { deps, chamadas } = fakeDeps([{ id: compraId, status: "pago", checkout: "chk_1", cliente: "cus_9" }]);
    await processarEvento({ id: "1", event: "PAYMENT_REFUNDED", payment: { id: "p", checkoutSession: "chk_1" } }, deps);
    await processarEvento({ id: "2", event: "PAYMENT_REFUNDED", payment: { id: "p", externalReference: compraId } }, deps);
    await processarEvento({ id: "3", event: "PAYMENT_CHARGEBACK_REQUESTED", payment: { id: "p", customer: "cus_9" } }, deps);
    expect(chamadas).toEqual([
      `estornar:${compraId}:reembolsado`,
      `estornar:${compraId}:reembolsado`,
      `estornar:${compraId}:contestado`,
    ]);
  });

  it("pagamento confirmado sem vínculo com checkout é ignorado (não usa o cliente)", async () => {
    const { deps, chamadas } = fakeDeps([{ id: compraId, status: "pago", cliente: "cus_9" }]);
    const r = await processarEvento({ id: "1", event: "PAYMENT_RECEIVED", payment: { id: "p", customer: "cus_9" } }, deps);
    expect(r.acao).toBe("ignorado");
    expect(chamadas).toEqual([]);
  });

  it("eventos desconhecidos são ignorados", async () => {
    const { deps } = fakeDeps([]);
    expect((await processarEvento({ id: "1", event: "PAYMENT_BANK_SLIP_VIEWED" }, deps)).acao).toBe("ignorado");
  });
});
