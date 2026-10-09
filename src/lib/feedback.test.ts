import { describe, expect, it } from "vitest";
import { erroDeEnvio, montarConversa, validarFeedback, type Feedback } from "./feedback";

describe("validarFeedback", () => {
  it("aceita categoria válida e apara a mensagem", () => {
    expect(validarFeedback("sugestao", "  Poderia ter modo escuro  ")).toEqual({
      ok: true,
      categoria: "sugestao",
      mensagem: "Poderia ter modo escuro",
    });
  });
  it("recusa categoria desconhecida", () => {
    expect(validarFeedback("spam", "Mensagem comprida o bastante").ok).toBe(false);
  });
  it("recusa mensagem curta ou longa demais", () => {
    expect(validarFeedback("elogio", "   curta   ").ok).toBe(false);
    expect(validarFeedback("elogio", "a".repeat(4001)).ok).toBe(false);
    expect(validarFeedback("elogio", "a".repeat(4000)).ok).toBe(true);
  });
});

describe("montarConversa", () => {
  const feedback: Feedback = {
    id: "f1",
    categoria: "problema",
    mensagem: "O vídeo travou",
    status: "respondido",
    resposta_vista: false,
    criado_em: "2026-10-01T10:00:00Z",
    atualizado_em: "2026-10-01T12:00:00Z",
  };
  it("começa pela abertura e ordena por data, só da conversa", () => {
    const conversa = montarConversa(feedback, [
      { id: "m2", feedback_id: "f1", da_equipe: false, texto: "Ainda trava", criado_em: "2026-10-01T12:00:00Z" },
      { id: "m1", feedback_id: "f1", da_equipe: true, texto: "Pode testar?", criado_em: "2026-10-01T11:00:00Z" },
      { id: "x", feedback_id: "f2", da_equipe: true, texto: "Outra conversa", criado_em: "2026-10-01T11:30:00Z" },
    ]);
    expect(conversa.map((m) => m.texto)).toEqual(["O vídeo travou", "Pode testar?", "Ainda trava"]);
    expect(conversa[0].da_equipe).toBe(false);
  });
});

describe("erroDeEnvio", () => {
  it("traduz os erros do banco", () => {
    expect(erroDeEnvio("conversa_encerrada")).toMatch(/encerrada/);
    expect(erroDeEnvio("limite_mensagens")).toMatch(/muitas mensagens/);
    expect(erroDeEnvio("qualquer outra coisa")).toMatch(/Tente de novo/);
  });
});
