import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
const { destinoSeguro } = await import("./url");

describe("destinoSeguro", () => {
  it("aceita caminhos internos", () => {
    expect(destinoSeguro("/assinar")).toBe("/assinar");
    expect(destinoSeguro("/redefinir-senha?x=1")).toBe("/redefinir-senha?x=1");
  });
  it("recusa links para outros sites", () => {
    expect(destinoSeguro("https://golpe.com")).toBe("/aluno");
    expect(destinoSeguro("//golpe.com")).toBe("/aluno");
    expect(destinoSeguro("/\\golpe.com")).toBe("/aluno");
    expect(destinoSeguro(null)).toBe("/aluno");
  });
});
