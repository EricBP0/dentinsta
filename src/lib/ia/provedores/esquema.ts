// Converte um schema zod no subconjunto de JSON Schema que o Gemini aceita em
// responseJsonSchema. O que não é aceito (ex.: minLength, $schema) sai; a
// resposta é validada com o zod completo depois.

import { z } from "zod";

const ACEITAS = new Set([
  "$id", "$defs", "$ref", "$anchor", "type", "format", "title", "description", "enum", "items", "prefixItems",
  "minItems", "maxItems", "minimum", "maximum", "anyOf", "oneOf", "properties", "additionalProperties", "required",
  "propertyOrdering",
]);
// Mapas de nomes (as chaves são nomes de campos, não palavras do schema).
const MAPAS = new Set(["properties", "$defs"]);

function limpar(no: unknown): unknown {
  if (Array.isArray(no)) return no.map(limpar);
  if (!no || typeof no !== "object") return no;
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(no)) {
    if (!ACEITAS.has(chave)) continue;
    // z.number().int() vira ±2^53; limites assim não dizem nada e podem ser recusados.
    if ((chave === "minimum" || chave === "maximum") && Math.abs(Number(valor)) >= Number.MAX_SAFE_INTEGER) continue;
    saida[chave] = MAPAS.has(chave)
      ? Object.fromEntries(Object.entries(valor as Record<string, unknown>).map(([k, v]) => [k, limpar(v)]))
      : limpar(valor);
  }
  return saida;
}

export function schemaParaGemini(schema: z.ZodType): unknown {
  return limpar(z.toJSONSchema(schema));
}
