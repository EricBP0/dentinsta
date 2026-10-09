import { describe, expect, it } from "vitest";
import { validarFeedback } from "./feedback";

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
