import { describe, expect, it } from "vitest";
import { z } from "zod";
import { SaidaGeracaoSchema } from "@/lib/ia/geracao/prompt";
import { schemaParaGemini } from "./esquema";

describe("schemaParaGemini", () => {
  it("tira o que o Gemini não aceita e mantém a estrutura", () => {
    const schema = z.object({ nota: z.number().int(), texto: z.string().min(1), tipo: z.enum(["a", "b"]) });
    expect(schemaParaGemini(schema)).toEqual({
      type: "object",
      properties: { nota: { type: "integer" }, texto: { type: "string" }, tipo: { type: "string", enum: ["a", "b"] } },
      required: ["nota", "texto", "tipo"],
      additionalProperties: false,
    });
  });
  it("não confunde nomes de campo com palavras do schema", () => {
    const schema = z.object({ format: z.string(), minLength: z.number() });
    expect(Object.keys((schemaParaGemini(schema) as { properties: object }).properties)).toEqual(["format", "minLength"]);
  });
  it("o schema da geração de questões passa inteiro", () => {
    const json = JSON.stringify(schemaParaGemini(SaidaGeracaoSchema));
    expect(json).toContain("rubrica");
    expect(json).not.toContain("$schema");
    expect(json).not.toContain("9007199254740991");
  });
});
