import { describe, expect, it } from "vitest";
import { etiquetasDe, notaAnual, ofertaPara, perfilDe, perguntasDa, validarEtapa, type Respostas } from "./perfil-cliente";

const DISC = ["d-endo", "d-perio", "d-anato"];

const estudanteClinica: Respostas = {
  p1: "estudante",
  p5: "5-6",
  p8: ["d-endo"],
  p17: ["endodontia"],
  p18: "clinica",
  p19: "memoria",
  p20: "sem_data",
};

describe("perguntasDa", () => {
  it("etapa 1 tem 7 perguntas para estudante e para formado; 5 para 'outro'", () => {
    expect(perguntasDa(1, { p1: "estudante" }).map((p) => p.numero)).toEqual([1, 5, 8, 17, 18, 19, 20]);
    expect(perguntasDa(1, { p1: "formado_ate2" }).map((p) => p.numero)).toEqual([1, 11, 13, 17, 18, 19, 20]);
    expect(perguntasDa(1, { p1: "outro" })).toHaveLength(5);
  });
  it("etapa 2 segue o caminho, sem as perguntas de mentoria (16 e 24)", () => {
    const estudante = perguntasDa(2, { p1: "estudante" }).map((p) => p.numero);
    expect(estudante).toEqual([2, 3, 4, 6, 7, 9, 10, 21, 22, 23, 25, 26]);
    expect(perguntasDa(2, { p1: "formado_mais2" }).map((p) => p.numero)).toEqual([2, 3, 4, 12, 14, 15, 21, 22, 23, 25, 26]);
  });
});

describe("validarEtapa", () => {
  it("aceita a etapa 1 completa e descarta perguntas de outro caminho", () => {
    const r = validarEtapa(1, { ...estudanteClinica, p11: "consultorio_proprio", p99: "x" }, {}, DISC);
    expect(r).toEqual({ respostas: estudanteClinica });
  });
  it("aponta a pergunta obrigatória que faltou", () => {
    expect(validarEtapa(1, { ...estudanteClinica, p19: undefined }, {}, DISC)).toEqual({
      erro: "Responda a pergunta 19: O que mais te trava hoje?",
    });
  });
  it("limita as múltiplas e só aceita disciplinas que existem", () => {
    const r = validarEtapa(1, { ...estudanteClinica, p8: ["d-endo", "hack", "d-perio", "d-anato"], p17: ["endodontia", "endodontia"] }, {}, DISC);
    expect(r).toMatchObject({ respostas: { p8: ["d-endo", "d-perio"], p17: ["endodontia"] } });
  });
  it("etapa 2: opcionais podem ficar em branco; contato só com a caixa marcada", () => {
    const valida = { p4: "anuncio", p6: "publica", p6_extra: " USP ", p7: "sim", p9: ["livros"], p10: "5a10", p21: "preco", p22: "colega", p23: "parcelado", p25: "whatsapp" };
    const entrada = { ...valida, p3: "XX" };
    const r = validarEtapa(2, entrada, estudanteClinica, DISC);
    expect(r).toEqual({ respostas: { ...valida, p6_extra: "USP", contato: false } });
    expect(validarEtapa(2, { ...entrada, contato: true }, estudanteClinica, DISC)).toMatchObject({ respostas: { contato: true } });
  });
});

describe("perfil, etiquetas e nota", () => {
  it("identifica os seis perfis do documento", () => {
    expect(perfilDe({ p1: "estudante", p5: "3-4" })).toBe("calouro");
    expect(perfilDe(estudanteClinica)).toBe("clinica");
    expect(perfilDe({ p1: "estudante", p5: "9-10" })).toBe("formando");
    expect(perfilDe({ p1: "formado_ate2", p11: "clinica_terceiros" })).toBe("recem_formado");
    expect(perfilDe({ p1: "formado_mais2", p11: "consultorio_proprio" })).toBe("consultorio");
    expect(perfilDe({ p1: "estudante", p5: "1-2", p18: "concurso" })).toBe("concurseiro");
    expect(perfilDe({ p1: "outro" })).toBe("outro");
  });
  it("gera as etiquetas por grupo", () => {
    expect(etiquetasDe({ ...estudanteClinica, p4: "telegram", p23: "pix", p22: "sozinho" })).toEqual([
      "perfil:clinica",
      "area:endodontia",
      "dor:memoria",
      "urgencia:sem_data",
      "origem:telegram",
      "pagamento:pix",
      "companhia:sozinho",
    ]);
  });
  it("nota do anual soma os sinais (máximo 10)", () => {
    expect(notaAnual(estudanteClinica)).toBe(5);
    expect(notaAnual({ ...estudanteClinica, p10: "mais10", p23: "parcelado", p21: "preco" })).toBe(10);
    expect(notaAnual({ ...estudanteClinica, p21: "testar" })).toBe(5);
    expect(notaAnual({ p1: "estudante", p5: "1-2", p20: "2semanas" })).toBe(0);
  });
});

describe("ofertaPara", () => {
  const essencialMensal = { plano: "essencial" as const, ciclo: "mensal" as const, modulos: ["disciplinas"], titular: true, origem: "asaas" as const };

  it("dor única e nota baixa: o adicional ligado à dor", () => {
    expect(ofertaPara(estudanteClinica, essencialMensal)).toMatchObject({ chave: "flashcards", texto: expect.stringMatching(/R\$\s14,90\/mês/) });
  });
  it("nota 6+ ou prova em 2 semanas: o Completo", () => {
    expect(ofertaPara({ ...estudanteClinica, p23: "parcelado" }, essencialMensal)?.chave).toBe("completo");
    expect(ofertaPara({ ...estudanteClinica, p19: "tempo", p20: "2semanas" }, essencialMensal)?.chave).toBe("completo");
  });
  it("quem já tem tudo e estuda com colega: o Duplo", () => {
    const completo = { ...essencialMensal, plano: "completo" as const, modulos: ["disciplinas", "simulados", "flashcards", "chat", "consultorio"] };
    expect(ofertaPara({ ...estudanteClinica, p22: "colega" }, completo)?.chave).toBe("duplo");
    expect(ofertaPara(estudanteClinica, completo)).toBeNull();
  });
  it("sem oferta no painel para anual, cortesia e convidado", () => {
    expect(ofertaPara(estudanteClinica, { ...essencialMensal, ciclo: "anual" })).toBeNull();
    expect(ofertaPara(estudanteClinica, { ...essencialMensal, origem: "manual" })).toBeNull();
    expect(ofertaPara(estudanteClinica, { ...essencialMensal, titular: false })).toBeNull();
  });
});
