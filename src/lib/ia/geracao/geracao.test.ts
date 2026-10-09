import { describe, expect, it } from "vitest";
import { montarBlocosMaterial, tipoDoArquivo, validarArquivos } from "./material";
import { converterQuestoesGeradas, montarPedidoGeracao, type QuestaoGerada } from "./prompt";

const base: QuestaoGerada = {
  tipo: "objetiva",
  tema: "Irrigação",
  dificuldade: 2,
  enunciado: "Qual solução dissolve tecido orgânico?",
  alternativas: ["Soro", "Hipoclorito de sódio", "EDTA", "Clorexidina", "Água"],
  gabarito: "B",
  explicacao: "O hipoclorito dissolve tecido orgânico.",
  rubrica: [],
  fonte: "Apostila, p. 3",
};

describe("converterQuestoesGeradas", () => {
  it("aceita objetiva e discursiva válidas e guarda a fonte", () => {
    const { questoes, descartadas } = converterQuestoesGeradas([
      base,
      {
        ...base,
        tipo: "discursiva",
        alternativas: [],
        gabarito: "O EDTA remove a smear layer.",
        rubrica: [
          { criterio: "Cita smear layer", pontos: 5 },
          { criterio: "Explica quelação: porção inorgânica", pontos: 5 },
        ],
      },
    ]);
    expect(descartadas).toEqual([]);
    expect(questoes[0]).toMatchObject({ gabarito: "B", fonte: "Apostila, p. 3" });
    expect(questoes[0].alternativas[1]).toEqual({ letra: "B", texto: "Hipoclorito de sódio" });
    expect(questoes[1].rubrica).toEqual([
      { criterio: "Cita smear layer", pontos: 5 },
      { criterio: "Explica quelação: porção inorgânica", pontos: 5 },
    ]);
  });

  it("limpa letras que a IA colocou no texto e no gabarito", () => {
    const { questoes } = converterQuestoesGeradas([
      { ...base, alternativas: ["A) Soro", "B) Hipoclorito", "C) EDTA", "D) Clorexidina", "E) Água"], gabarito: "B)" },
    ]);
    expect(questoes[0].alternativas[0].texto).toBe("Soro");
    expect(questoes[0].gabarito).toBe("B");
  });

  it("descarta questão inválida em vez de salvar", () => {
    const { questoes, descartadas } = converterQuestoesGeradas([
      { ...base, gabarito: "F" },
      { ...base, dificuldade: 7 },
    ]);
    expect(questoes).toHaveLength(0);
    expect(descartadas).toHaveLength(2);
  });
});

describe("montarPedidoGeracao", () => {
  it("avisa quando o material é prova antiga e lista o que já existe", () => {
    const pedido = montarPedidoGeracao({
      disciplina: "Endodontia",
      tipoMaterial: "prova",
      config: { objetivas: 8, discursivas: 2, dificuldade: null, tema: "", instrucoes: "Foco em casos clínicos" },
      temasExistentes: ["Irrigação"],
      enunciadosExistentes: ["Qual o irrigante mais usado?"],
    });
    expect(pedido).toContain("8 questões objetivas e 2 discursivas");
    expect(pedido).toContain("Não copie nem parafraseie");
    expect(pedido).toContain("<orientacoes>\nFoco em casos clínicos\n</orientacoes>");
    expect(pedido).toContain("- Qual o irrigante mais usado?");
  });
});

describe("material", () => {
  it("reconhece formatos pelo nome quando o navegador não informa o tipo", () => {
    expect(tipoDoArquivo("resumo.md", "")).toBe("texto");
    expect(tipoDoArquivo("aula.DOCX", "")).toBe("docx");
    expect(tipoDoArquivo("foto.jpg", "")).toBe("imagem");
    expect(tipoDoArquivo("planilha.xlsx", "")).toBeNull();
  });

  it("recusa formato não aceito e material grande demais", () => {
    expect(validarArquivos([{ nome: "a.xlsx", tipo: "", tamanho: 10 }])).toContain("Formato não aceito");
    expect(validarArquivos([{ nome: "a.pdf", tipo: "application/pdf", tamanho: 30 * 1024 * 1024 }])).toContain("22 MB");
    expect(validarArquivos([{ nome: "a.pdf", tipo: "application/pdf", tamanho: 1024 }])).toBeNull();
  });

  it("monta PDF como arquivo e texto colado como texto com título", async () => {
    const blocos = await montarBlocosMaterial(
      [{ nome: "apostila.pdf", tipo: "application/pdf", dados: Buffer.from("%PDF-1.4") }],
      "Anotações da aula",
    );
    expect(blocos[0]).toMatchObject({ tipo: "pdf", nome: "apostila.pdf" });
    expect(blocos[1]).toMatchObject({ tipo: "texto", titulo: "Texto enviado pelo professor", texto: "Anotações da aula" });
  });
});
