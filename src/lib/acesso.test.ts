import { describe, expect, it } from "vitest";
import { calcularJanela, dataEfetivaPublicacao, iaAtiva, situacaoItem } from "./acesso";

const d = (iso: string) => new Date(iso);
const acesso = calcularJanela(d("2026-01-15T00:00:00Z")); // janela até 2027-01-15

describe("calcularJanela", () => {
  it("dá 12 meses de novidades e de IA", () => {
    expect(acesso.novidadesAte.toISOString()).toBe("2027-01-15T00:00:00.000Z");
    expect(acesso.iaAte.toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });
});

describe("dataEfetivaPublicacao", () => {
  it("usa a publicação mais tardia entre item, módulo e disciplina", () => {
    expect(
      dataEfetivaPublicacao({
        item: d("2026-01-01"),
        modulo: d("2027-03-01"),
        disciplina: d("2025-06-01"),
      }),
    ).toEqual(d("2027-03-01"));
  });
});

describe("situacaoItem", () => {
  const antigo = { item: d("2025-05-01"), modulo: d("2025-05-01"), disciplina: d("2025-05-01") };
  const dentro = { item: d("2026-12-01"), modulo: d("2025-05-01"), disciplina: d("2025-05-01") };
  const depois = { item: d("2027-02-01"), modulo: d("2025-05-01"), disciplina: d("2025-05-01") };

  it("libera conteúdo anterior à compra", () => {
    expect(situacaoItem({ acesso, datas: antigo })).toBe("liberado");
  });
  it("libera conteúdo publicado dentro da janela", () => {
    expect(situacaoItem({ acesso, datas: dentro })).toBe("liberado");
  });
  it("pede renovação para conteúdo publicado depois da janela", () => {
    expect(situacaoItem({ acesso, datas: depois })).toBe("renove");
  });
  it("bloqueia módulo novo dentro de disciplina antiga", () => {
    const moduloNovo = { item: d("2025-05-01"), modulo: d("2027-02-01"), disciplina: d("2025-05-01") };
    expect(situacaoItem({ acesso, datas: moduloNovo })).toBe("renove");
  });
  it("sem compra não libera nada", () => {
    expect(situacaoItem({ acesso: null, datas: antigo })).toBe("sem_acesso");
  });
  it("equipe vê tudo", () => {
    expect(situacaoItem({ acesso: null, datas: depois, equipe: true })).toBe("liberado");
  });
});

describe("iaAtiva", () => {
  it("fica ativa durante a janela e para depois", () => {
    expect(iaAtiva(acesso, d("2026-06-01"))).toBe(true);
    expect(iaAtiva(acesso, d("2027-01-16"))).toBe(false);
    expect(iaAtiva(null, d("2026-06-01"))).toBe(false);
  });
});
