import { describe, expect, it } from "vitest";
import {
  correspondeBusca,
  faixa,
  lerPagina,
  montarQuery,
  paginar,
  paginasVisiveis,
  termoIlike,
  totalDePaginas,
} from "./listagem";

describe("lerPagina", () => {
  it("aceita só inteiros positivos", () => {
    expect(lerPagina("3")).toBe(3);
    expect(lerPagina(undefined)).toBe(1);
    expect(lerPagina("0")).toBe(1);
    expect(lerPagina("-2")).toBe(1);
    expect(lerPagina("1.5")).toBe(1);
    expect(lerPagina("abc")).toBe(1);
    expect(lerPagina(["2", "3"])).toBe(1);
  });
});

describe("correspondeBusca", () => {
  it("ignora acentos e maiúsculas", () => {
    expect(correspondeBusca("dentistica", "Dentística Restauradora")).toBe(true);
    expect(correspondeBusca("ENDO", "Endodontia")).toBe(true);
  });
  it("exige todas as palavras, em qualquer dos textos", () => {
    expect(correspondeBusca("canal endo", "Tratamento de canal", "Endodontia")).toBe(true);
    expect(correspondeBusca("canal perio", "Tratamento de canal", "Endodontia")).toBe(false);
  });
  it("busca vazia casa com tudo", () => {
    expect(correspondeBusca("  ", "qualquer")).toBe(true);
  });
});

describe("paginar", () => {
  const lista = Array.from({ length: 23 }, (_, i) => i + 1);
  it("recorta a página pedida", () => {
    expect(paginar(lista, 2, 10)).toEqual({ itens: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], pagina: 2, totalPaginas: 3, total: 23 });
  });
  it("página além do fim vira a última", () => {
    expect(paginar(lista, 9, 10).pagina).toBe(3);
    expect(paginar(lista, 9, 10).itens).toEqual([21, 22, 23]);
  });
  it("lista vazia tem uma página", () => {
    expect(paginar([], 1, 10)).toEqual({ itens: [], pagina: 1, totalPaginas: 1, total: 0 });
  });
});

describe("faixa e totalDePaginas", () => {
  it("calcula o intervalo do range", () => {
    expect(faixa(1, 20)).toEqual([0, 19]);
    expect(faixa(3, 20)).toEqual([40, 59]);
  });
  it("arredonda o total para cima", () => {
    expect(totalDePaginas(41, 20)).toBe(3);
    expect(totalDePaginas(0, 20)).toBe(1);
    expect(totalDePaginas(null, 20)).toBe(1);
  });
});

describe("termoIlike", () => {
  it("remove o que quebraria o filtro do PostgREST", () => {
    expect(termoIlike("a,b(c)%d_e*")).toBe("a b c d e");
    expect(termoIlike("  maria   silva ")).toBe("maria silva");
  });
});

describe("paginasVisiveis", () => {
  it("mostra todas quando são poucas", () => {
    expect(paginasVisiveis(2, 4)).toEqual([1, 2, 3, 4]);
  });
  it("encurta com saltos", () => {
    expect(paginasVisiveis(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(paginasVisiveis(1, 10)).toEqual([1, 2, null, 10]);
  });
});

describe("montarQuery", () => {
  it("omite vazios", () => {
    expect(montarQuery({ q: "endo", pagina: 2, status: "", x: null })).toBe("?q=endo&pagina=2");
    expect(montarQuery({ q: "" })).toBe("");
  });
});
