import { describe, expect, it } from "vitest";
import { alvosDepoisDe, alvosDoUso, custoEstimado, esforcoDoUso, lerLista } from "./config";

const chaves = { GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" };

describe("lerLista", () => {
  it("lê provedor:modelo e deduz pelo nome quando não tem prefixo", () => {
    expect(lerLista("gemini:gemini-3.8-flash, claude-haiku-5-5 , anthropic:claude-opus-5-5")).toEqual([
      { provedor: "gemini", modelo: "gemini-3.8-flash" },
      { provedor: "anthropic", modelo: "claude-haiku-5-5" },
      { provedor: "anthropic", modelo: "claude-opus-5-5" },
    ]);
  });
  it("ignora itens que não reconhece", () => {
    expect(lerLista("openai:gpt, xyz, , gemini:")).toEqual([]);
  });
});

describe("alvosDoUso", () => {
  it("padrão: Gemini 3.6 Flash com o Claude de reserva", () => {
    expect(alvosDoUso("correcao", chaves)).toEqual([
      { provedor: "gemini", modelo: "gemini-3.6-flash" },
      { provedor: "anthropic", modelo: "claude-opus-5-5" },
    ]);
  });
  it("respeita a variável antiga do modelo do Claude", () => {
    expect(alvosDoUso("chat", { ...chaves, IA_MODELO_CHAT: "claude-sonnet-5-5" })[1].modelo).toBe("claude-sonnet-5-5");
  });
  it("a lista configurada manda, na ordem dada", () => {
    expect(alvosDoUso("geracao", { ...chaves, IA_GERACAO: "claude-haiku-5-5,gemini-3.8-flash" })).toEqual([
      { provedor: "anthropic", modelo: "claude-haiku-5-5" },
      { provedor: "gemini", modelo: "gemini-3.8-flash" },
    ]);
  });
  it("pula provedores sem chave (o site funciona antes de cadastrar o Gemini)", () => {
    expect(alvosDoUso("correcao", { ANTHROPIC_API_KEY: "a" })).toEqual([{ provedor: "anthropic", modelo: "claude-opus-5-5" }]);
    expect(alvosDoUso("correcao", {})).toEqual([]);
  });
});

describe("esforcoDoUso", () => {
  it("usa as variáveis de esforço e os padrões de antes", () => {
    expect(esforcoDoUso("correcao", {})).toBe("low");
    expect(esforcoDoUso("geracao", {})).toBe("medium");
    expect(esforcoDoUso("geracao", { IA_EFFORT_GERACAO: "high" })).toBe("high");
    expect(esforcoDoUso("chat", { IA_EFFORT: "max" })).toBe("low");
  });
});

describe("custoEstimado", () => {
  const uso = { entrada: 1_000_000, saida: 100_000, cache: 0 };
  it("Gemini Flash: preço de lançamento em 2026 e cheio em 2027", () => {
    expect(custoEstimado("gemini-3.6-flash", uso, { data: new Date("2026-10-09") })).toBeCloseTo(0.75 + 0.375);
    expect(custoEstimado("gemini-3.6-flash", uso, { data: new Date("2027-02-01") })).toBeCloseTo(1.5 + 0.75);
  });
  it("cache e lote barateiam", () => {
    expect(custoEstimado("claude-opus-5-5", { entrada: 1_000_000, saida: 0, cache: 1_000_000 })).toBeCloseTo(0.2);
    expect(custoEstimado("claude-opus-5-5", uso, { lote: true })).toBeCloseTo((4 + 2) / 2);
  });
  it("modelo desconhecido não tem estimativa", () => {
    expect(custoEstimado("modelo-novo", uso)).toBeNull();
  });
});

describe("alvosDepoisDe", () => {
  const lista = lerLista("gemini:gemini-3.6-flash,anthropic:claude-opus-5-5,claude-haiku-5-5");
  it("a reserva é o que vem depois do modelo que falhou", () => {
    expect(alvosDepoisDe(lista, "gemini:gemini-3.6-flash").map((a) => a.modelo)).toEqual(["claude-opus-5-5", "claude-haiku-5-5"]);
    expect(alvosDepoisDe(lista, "claude-haiku-5-5")).toEqual([]);
  });
  it("modelo que saiu da lista: tenta todos os outros", () => {
    expect(alvosDepoisDe(lista, "gemini:gemini-3.8-flash")).toHaveLength(3);
  });
});
