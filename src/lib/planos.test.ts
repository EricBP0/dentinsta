import { describe, expect, it } from "vitest";
import { ehUpgrade, montarEscolha, nomeDaEscolha, somaAvulsos, upsellParaCompleto } from "./planos";

describe("preços", () => {
  it("a soma dos módulos avulsos é a âncora do Completo", () => {
    expect(somaAvulsos()).toBe(6750);
  });
});

describe("montarEscolha", () => {
  it("Essencial soma Disciplinas com os avulsos escolhidos", () => {
    expect(montarEscolha("essencial", "mensal", ["simulados", "chat"])).toEqual({
      plano: "essencial",
      ciclo: "mensal",
      modulos: ["disciplinas", "simulados", "chat"],
      valorCentavos: 1490 + 1490 + 1790,
    });
  });
  it("ignora módulos desconhecidos e repetidos", () => {
    expect(montarEscolha("essencial", "mensal", ["chat", "chat", "hack"])?.modulos).toEqual(["disciplinas", "chat"]);
  });
  it("Essencial com todos os avulsos vira Completo", () => {
    expect(montarEscolha("essencial", "mensal", ["simulados", "flashcards", "chat", "consultorio"])).toMatchObject({
      plano: "completo",
      valorCentavos: 3490,
    });
  });
  it("anual só no Completo e no Duplo", () => {
    expect(montarEscolha("essencial", "anual")).toBeNull();
    expect(montarEscolha("completo", "anual")?.valorCentavos).toBe(34900);
    expect(montarEscolha("duplo", "anual")?.valorCentavos).toBe(59900);
    expect(montarEscolha("duplo", "mensal")?.valorCentavos).toBe(5990);
  });
  it("recusa plano inválido", () => {
    expect(montarEscolha("vip", "mensal")).toBeNull();
  });
});

describe("upsellParaCompleto", () => {
  it("mostra quanto falta para levar tudo", () => {
    const escolha = montarEscolha("essencial", "mensal", ["simulados", "chat"])!;
    expect(upsellParaCompleto(escolha)).toEqual({ diferencaCentavos: 3490 - 4770, modulosGanhos: ["flashcards", "consultorio"] });
  });
  it("também oferece para o Essencial puro, mas não para quem já leva tudo", () => {
    expect(upsellParaCompleto(montarEscolha("essencial", "mensal")!)?.diferencaCentavos).toBe(2000);
    expect(upsellParaCompleto(montarEscolha("completo", "mensal")!)).toBeNull();
  });
});

describe("nomeDaEscolha", () => {
  it("descreve plano, módulos e ciclo", () => {
    expect(nomeDaEscolha(montarEscolha("essencial", "mensal", ["flashcards"])!)).toBe("Essencial + Flashcards");
    expect(nomeDaEscolha(montarEscolha("duplo", "anual")!)).toBe("Duplo (anual)");
  });
});

describe("ehUpgrade", () => {
  const essencial = { plano: "essencial" as const, modulos: ["disciplinas", "chat"] };
  it("ganhar módulo ou ir para o Duplo é subir", () => {
    expect(ehUpgrade(essencial, montarEscolha("completo", "mensal")!)).toBe(true);
    expect(ehUpgrade({ plano: "completo", modulos: [] }, montarEscolha("duplo", "mensal")!)).toBe(true);
  });
  it("perder módulo é descer", () => {
    expect(ehUpgrade(essencial, montarEscolha("essencial", "mensal")!)).toBe(false);
    expect(ehUpgrade({ plano: "duplo", modulos: [] }, montarEscolha("completo", "mensal")!)).toBe(false);
  });
});
