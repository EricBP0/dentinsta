import { describe, expect, it } from "vitest";
import { formatarTelefone, normalizarTelefone, validarContato } from "./cadastro";

describe("normalizarTelefone", () => {
  it("aceita os formatos comuns e guarda só os dígitos com DDD", () => {
    expect(normalizarTelefone("(11) 98765-4321")).toBe("11987654321");
    expect(normalizarTelefone("+55 11 98765 4321")).toBe("11987654321");
    expect(normalizarTelefone("5511987654321")).toBe("11987654321");
    expect(normalizarTelefone("11 3456-7890")).toBe("1134567890");
  });
  it("recusa sem DDD, curto demais ou celular sem o 9", () => {
    expect(normalizarTelefone("98765-4321")).toBeNull();
    expect(normalizarTelefone("11 88765 4321")).toBeNull();
    expect(normalizarTelefone("0119876543")).toBeNull();
    expect(normalizarTelefone("")).toBeNull();
  });
  it("formata para exibir", () => {
    expect(formatarTelefone("11987654321")).toBe("(11) 98765-4321");
    expect(formatarTelefone("1134567890")).toBe("(11) 3456-7890");
  });
});

describe("validarContato", () => {
  it("limpa nome e e-mail", () => {
    expect(validarContato({ nome: "  Ana   Souza ", email: " Ana@Email.COM ", telefone: "(21) 99999-0000" })).toEqual({
      nome: "Ana Souza",
      email: "ana@email.com",
      telefone: "21999990000",
    });
  });
  it("aponta o campo errado", () => {
    expect(validarContato({ nome: "A", email: "a@b.co", telefone: "21999990000" })).toEqual({ erro: "Informe seu nome." });
    expect(validarContato({ nome: "Ana", email: "ana@", telefone: "21999990000" })).toEqual({ erro: "Informe um e-mail válido." });
    expect(validarContato({ nome: "Ana", email: "ana@b.co", telefone: "999" })).toEqual({ erro: "Informe um WhatsApp válido, com DDD." });
  });
});
