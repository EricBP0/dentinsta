import { describe, expect, it } from "vitest";
import { importarQuestoesCsv, lerCsv } from "./csv";
import { lerRubrica } from "./questao";

describe("lerCsv", () => {
  it("entende ponto e vírgula, aspas e quebra de linha dentro da célula", () => {
    const csv = 'tipo;enunciado\r\nobjetiva;"Linha 1\nLinha 2; com ""aspas"""\r\n';
    expect(lerCsv(csv)).toEqual([
      ["tipo", "enunciado"],
      ["objetiva", 'Linha 1\nLinha 2; com "aspas"'],
    ]);
  });
  it("detecta vírgula como separador", () => {
    expect(lerCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("lerRubrica", () => {
  it("lê critérios com pontos", () => {
    expect(lerRubrica("Cita o hipoclorito: 2 | Explica a ação = 3,5 pontos")).toEqual([
      { criterio: "Cita o hipoclorito", pontos: 2 },
      { criterio: "Explica a ação", pontos: 3.5 },
    ]);
  });
});

describe("importarQuestoesCsv", () => {
  const cabecalho = "Tipo;Tema;Dificuldade;Enunciado;A;B;C;D;E;Gabarito;Explicação;Rubrica";

  it("importa objetiva e discursiva e aponta erros por linha", () => {
    const csv = [
      cabecalho,
      "objetiva;Irrigação;fácil;Qual o irrigante mais usado?;Soro;Hipoclorito;;;;b;Por ser antimicrobiano;",
      "discursiva;Irrigação;3;Explique o uso do EDTA.;;;;;;Remove smear layer;;Cita smear layer: 5 | Cita quelação: 5",
      "objetiva;;2;Sem gabarito válido;Sim;Não;;;;D;;",
      "dissertativa;;2;Tipo errado;;;;;;x;;",
    ].join("\n");

    const { questoes, erros } = importarQuestoesCsv(csv);
    expect(questoes).toHaveLength(2);
    expect(questoes[0]).toMatchObject({
      tipo: "objetiva",
      dificuldade: 1,
      gabarito: "B",
      alternativas: [
        { letra: "A", texto: "Soro" },
        { letra: "B", texto: "Hipoclorito" },
      ],
      explicacao: "Por ser antimicrobiano",
    });
    expect(questoes[1]).toMatchObject({ tipo: "discursiva", dificuldade: 3, rubrica: [{ pontos: 5 }, { pontos: 5 }] });
    expect(erros.map((e) => e.linha)).toEqual([4, 5]);
  });

  it("exige colunas obrigatórias", () => {
    expect(importarQuestoesCsv("tema;enunciado\nx;y").erros[0].mensagem).toContain("tipo");
  });
});
