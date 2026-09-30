import { describe, expect, it } from "vitest";
import { gerarSlug } from "./slug";

describe("gerarSlug", () => {
  it("remove acentos e espaços", () => {
    expect(gerarSlug("Dentística Restauradora II")).toBe("dentistica-restauradora-ii");
    expect(gerarSlug("  Anatomia / Escultura  ")).toBe("anatomia-escultura");
  });
});
