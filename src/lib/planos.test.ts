import { describe, expect, it } from "vitest";
import { economiaAnual, ehUpgrade, montarEscolha, nomeDaEscolha, somaAvulsos, upsellParaCompleto } from "./planos";

describe("preços", () => {
  it("a soma dos módulos avulsos é a âncora do Completo", () => {
    expect(somaAvulsos()).toBe(10250);
  });
  it("anual em 12x sem juros: total = 12 parcelas, mais barato que 12 mensalidades", () => {
    expect(montarEscolha("essencial", "anual")?.valorCentavos).toBe(12 * 1490);
    expect(montarEscolha("completo", "anual")?.valorCentavos).toBe(12 * 3490);
    expect(montarEscolha("duplo", "anual")?.valorCentavos).toBe(12 * 5990);
    expect([economiaAnual("essencial"), economiaAnual("completo"), economiaAnual("duplo")]).toEqual([9600, 18000, 24000]);
  });
});

describe("montarEscolha", () => {
  it("Essencial soma Disciplinas com os avulsos escolhidos", () => {
    expect(montarEscolha("essencial", "mensal", ["simulados", "chat"])).toEqual({
      plano: "essencial",
      ciclo: "mensal",
      modulos: ["disciplinas", "simulados", "chat"],
      valorCentavos: 2290 + 2290 + 2690,
    });
  });
  it("ignora módulos desconhecidos e repetidos", () => {
    expect(montarEscolha("essencial", "mensal", ["chat", "chat", "hack"])?.modulos).toEqual(["disciplinas", "chat"]);
  });
  it("Essencial com todos os avulsos vira Completo", () => {
    expect(montarEscolha("essencial", "mensal", ["simulados", "flashcards", "chat", "consultorio"])).toMatchObject({
      plano: "completo",
      valorCentavos: 4990,
    });
  });
  it("Essencial anual é só com as Disciplinas; avulsos só no mensal", () => {
    expect(montarEscolha("essencial", "anual")).toEqual({ plano: "essencial", ciclo: "anual", modulos: ["disciplinas"], valorCentavos: 17880 });
    expect(montarEscolha("essencial", "anual", ["chat"])).toBeNull();
    expect(montarEscolha("duplo", "mensal")?.valorCentavos).toBe(7990);
  });
  it("recusa plano inválido", () => {
    expect(montarEscolha("vip", "mensal")).toBeNull();
  });
});

describe("upsellParaCompleto", () => {
  it("mostra quanto falta para levar tudo", () => {
    const escolha = montarEscolha("essencial", "mensal", ["simulados", "chat"])!;
    expect(upsellParaCompleto(escolha)).toMatchObject({ diferencaCentavos: 4990 - 7270, modulosGanhos: ["flashcards", "consultorio"] });
  });
  it("também oferece para o Essencial puro, mas não para quem já leva tudo", () => {
    expect(upsellParaCompleto(montarEscolha("essencial", "mensal")!)?.diferencaCentavos).toBe(2700);
    expect(upsellParaCompleto(montarEscolha("completo", "mensal")!)).toBeNull();
  });
  it("no anual, compara com o Completo anual, por parcela", () => {
    const upsell = upsellParaCompleto(montarEscolha("essencial", "anual")!)!;
    expect(upsell.completo).toMatchObject({ plano: "completo", ciclo: "anual", valorCentavos: 41880 });
    expect(upsell.diferencaCentavos).toBe(2000);
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
