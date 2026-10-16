import { describe, expect, it } from "vitest";
import {
  conferirSaque,
  descontoCentavos,
  nomeReservado,
  normalizarCodigo,
  normalizarCupom,
  validarChavePix,
  type ItemConferencia,
} from "./afiliados";

describe("link e cupom", () => {
  it("normaliza o código do link e o cupom", () => {
    expect(normalizarCodigo("Dra. Ana Lima")).toBe("dra-ana-lima");
    expect(normalizarCodigo("  Júlia   Ávila ")).toBe("julia-avila");
    expect(normalizarCodigo("ab")).toBeNull();
    expect(normalizarCupom("dra-ana10")).toBe("DRAANA10");
    expect(normalizarCupom("x!")).toBeNull();
  });
  it("desconto só na primeira cobrança, arredondado e nunca zerando o valor", () => {
    expect(descontoCentavos(4990, 10)).toBe(499);
    expect(descontoCentavos(41880, 15)).toBe(6282);
    expect(descontoCentavos(4990, 0)).toBe(0);
    expect(descontoCentavos(1000, 90)).toBe(900);
  });
  it("chave Pix por tipo", () => {
    expect(validarChavePix("CPF", "123.456.789-09")).toEqual({ tipo: "CPF", chave: "12345678909" });
    expect(validarChavePix("PHONE", "+55 (11) 98765-4321")).toEqual({ tipo: "PHONE", chave: "11987654321" });
    expect(validarChavePix("EMAIL", "Ana@Email.com ")).toEqual({ tipo: "EMAIL", chave: "ana@email.com" });
    expect(validarChavePix("CNPJ", "123")).toBeNull();
    expect(validarChavePix("XYZ", "a")).toBeNull();
  });
  it("o afiliado vê só o primeiro nome e a inicial do cliente", () => {
    expect(nomeReservado("Ana Souza Lima")).toBe("Ana L.");
    expect(nomeReservado("Ana")).toBe("Ana");
    expect(nomeReservado("")).toBe("Cliente");
  });
});

describe("conferirSaque", () => {
  const agora = new Date("2026-11-20T12:00:00Z");
  const afiliado = { usuarioId: "af-user", email: "dr@x.com", telefone: "11911112222", gatewayIdsProprios: ["cus_af"] };
  const base: ItemConferencia = {
    comissaoId: "c1",
    comissaoStatus: "em_saque",
    valorCentavos: 998,
    valorBaseCentavos: 4990,
    comissaoPct: 20,
    liberadaEm: "2026-11-15T00:00:00Z",
    compraStatus: "pago",
    pagoEm: "2026-10-16T00:00:00Z",
    clienteId: "cli-1",
    clienteEmail: "ana@x.com",
    clienteTelefone: "21999990000",
    clienteGatewayId: "cus_1",
    assinaturaStatus: "ativa",
    canceladaEm: null,
  };

  it("comissão normal passa", () => {
    const r = conferirSaque([base], afiliado, [{ clienteId: "cli-1", telefone: "21999990000", gatewayIds: ["cus_1"] }], agora);
    expect(r.itens[0]).toMatchObject({ nivel: "ok", motivos: [] });
    expect(r.totais.ok).toEqual({ quantidade: 1, centavos: 998 });
  });

  it("bloqueia estorno, carência, valor errado e autoindicação", () => {
    const r = conferirSaque(
      [
        { ...base, comissaoId: "estorno", compraStatus: "reembolsado" },
        { ...base, comissaoId: "carencia", liberadaEm: "2026-12-01T00:00:00Z" },
        { ...base, comissaoId: "valor", valorCentavos: 5000 },
        { ...base, comissaoId: "auto-email", clienteEmail: "DR@x.com" },
        { ...base, comissaoId: "auto-cpf", clienteGatewayId: "cus_af" },
        { ...base, comissaoId: "cancelada", comissaoStatus: "cancelada" },
      ],
      afiliado,
      [],
      agora,
    );
    expect(r.itens.map((i) => i.nivel)).toEqual(Array(6).fill("bloqueio"));
    expect(r.itens[0].motivos).toContain("Pagamento reembolsado");
    expect(r.itens[3].motivos).toContain("Autoindicação: o cliente é o próprio afiliado");
    expect(r.totais.bloqueio.quantidade).toBe(6);
  });

  it("alerta conta duplicada e cancelamento logo depois de pagar", () => {
    const clientes = [
      { clienteId: "cli-1", telefone: "21999990000", gatewayIds: ["cus_1"] },
      { clienteId: "cli-2", telefone: "21999990000", gatewayIds: ["cus_1"] },
    ];
    const r = conferirSaque([{ ...base, canceladaEm: "2026-10-19T00:00:00Z" }], afiliado, clientes, agora);
    expect(r.itens[0].nivel).toBe("alerta");
    expect(r.itens[0].motivos).toEqual([
      "Mesmo WhatsApp de outro cliente indicado (possível conta duplicada)",
      "Mesmo CPF no Asaas de outro cliente indicado (conta duplicada)",
      "Cancelou a renovação 3 dia(s) depois de pagar",
    ]);
  });
});
