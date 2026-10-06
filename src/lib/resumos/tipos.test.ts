import { describe, expect, it } from "vitest";
import { ancoraSecao, figurasDoResumo, type ConteudoResumo } from "./tipos";

describe("figurasDoResumo", () => {
  it("acha as figuras soltas e dentro de caixas, na ordem", () => {
    const resumo: ConteudoResumo = {
      secoes: [
        {
          numero: "01",
          rotulo: "",
          titulo: "Osteologia",
          blocos: [
            { t: "img", src: "a/img/0001.webp", w: 10, h: 10 },
            { t: "p", r: [{ x: "texto" }] },
            { t: "caixa", titulo: "", blocos: [{ t: "img", src: "a/img/0002.webp", w: 10, h: 10 }] },
          ],
        },
        { numero: "02", rotulo: "", titulo: "Músculos", blocos: [{ t: "img", src: "a/img/0003.webp", w: 1, h: 1 }] },
      ],
    };
    expect(figurasDoResumo(resumo)).toEqual(["a/img/0001.webp", "a/img/0002.webp", "a/img/0003.webp"]);
  });

  it("devolve lista vazia sem figuras", () => {
    expect(figurasDoResumo({ secoes: [] })).toEqual([]);
  });
});

describe("ancoraSecao", () => {
  it("numera a partir de 1", () => {
    expect(ancoraSecao(0)).toBe("secao-1");
  });
});
