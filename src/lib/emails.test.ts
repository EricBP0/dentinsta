import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { modelos } from "../../scripts/emails.mjs";

describe("modelos de e-mail", () => {
  it.each(modelos)("$arquivo está gerado e atualizado (rode npm run emails)", (m) => {
    const arquivo = readFileSync(join(process.cwd(), "supabase", "templates", m.arquivo), "utf8");
    expect(arquivo).toBe(m.html);
  });

  it.each(modelos)("$arquivo tem as variáveis do Supabase e a marca", (m) => {
    for (const v of m.variaveis) expect(m.html).toContain(v);
    expect(m.html).toContain("{{ .SiteURL }}/marca/odontolab-simbolo-512.png");
    expect(m.html).toContain(`<title>${m.assunto}</title>`);
  });

  it("links passam pelo /auth/confirmar com token_hash (funciona em qualquer aparelho)", () => {
    for (const m of modelos.filter((m) => m.html.includes("{{ .TokenHash }}"))) {
      expect(m.html).toMatch(/\{\{ \.SiteURL \}\}\/auth\/confirmar\?token_hash=\{\{ \.TokenHash \}\}&type=\w+&next=/);
      expect(m.html).not.toContain("{{ .ConfirmationURL }}");
    }
  });

  it("chaves {{ }} e blocos if/end estão balanceados", () => {
    for (const m of modelos) {
      expect(m.html.split("{{").length).toBe(m.html.split("}}").length);
      const ifs = m.html.match(/\{\{ if /g)?.length ?? 0;
      expect(m.html.match(/\{\{ end \}\}/g)?.length ?? 0).toBe(ifs);
    }
  });
});
