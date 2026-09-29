import { describe, expect, it } from "vitest";
import { importarCardsCsv, removerRepetidos, validarCard } from "./cards";

describe("importarCardsCsv", () => {
  it("lê planilha com cabeçalho e aponta linhas com erro", () => {
    const { cards, erros } = importarCardsCsv(
      "Frente;Verso;Imagem URL\nO que é smear layer?;Camada de detritos na parede do canal;\nSem verso;;\n",
    );
    expect(cards).toEqual([
      { frente: "O que é smear layer?", verso: "Camada de detritos na parede do canal", imagem_url: null, fonte: "" },
    ]);
    expect(erros).toEqual([{ linha: 3, mensagem: "verso vazio" }]);
  });

  it("aceita planilha sem cabeçalho (frente e verso nas duas primeiras colunas)", () => {
    const { cards } = importarCardsCsv("Irrigante que dissolve tecido?;Hipoclorito de sódio");
    expect(cards[0].verso).toBe("Hipoclorito de sódio");
  });
});

describe("validarCard", () => {
  it("recusa imagem com URL inválida", () => {
    expect(validarCard({ frente: "a", verso: "b", imagem_url: "javascript:alert(1)" })).toEqual({
      erro: "imagem_url inválida",
    });
  });
});

describe("removerRepetidos", () => {
  it("ignora acentos, pontuação e maiúsculas", () => {
    const card = (frente: string) => ({ frente, verso: "x", imagem_url: null, fonte: "" });
    const { unicos, repetidos } = removerRepetidos(
      [card("O que é Smear Layer?"), card("Função do EDTA"), card("função do edta!")],
      ["o que e smear layer"],
    );
    expect(unicos.map((c) => c.frente)).toEqual(["Função do EDTA"]);
    expect(repetidos).toBe(2);
  });
});
