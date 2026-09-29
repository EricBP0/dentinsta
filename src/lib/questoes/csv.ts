// Importação de questões por planilha (CSV exportado do Excel ou Google Sheets).

import { validarQuestao, type QuestaoNova } from "./questao";

export const COLUNAS_CSV = [
  "tipo",
  "tema",
  "dificuldade",
  "enunciado",
  "a",
  "b",
  "c",
  "d",
  "e",
  "gabarito",
  "explicacao",
  "rubrica",
  "estilo",
] as const;

/** Lê CSV com aspas, quebras de linha dentro de células e separador ";" ou ",". */
export function lerCsv(texto: string): string[][] {
  const conteudo = texto.replace(/^﻿/, "");
  const primeiraLinha = conteudo.split(/\r?\n/, 1)[0] ?? "";
  const separador =
    (primeiraLinha.match(/;/g)?.length ?? 0) >= (primeiraLinha.match(/,/g)?.length ?? 0) ? ";" : ",";

  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = "";
  let entreAspas = false;

  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i];
    if (entreAspas) {
      if (c === '"' && conteudo[i + 1] === '"') {
        celula += '"';
        i++;
      } else if (c === '"') {
        entreAspas = false;
      } else {
        celula += c;
      }
    } else if (c === '"') {
      entreAspas = true;
    } else if (c === separador) {
      linha.push(celula);
      celula = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && conteudo[i + 1] === "\n") i++;
      linha.push(celula);
      linhas.push(linha);
      linha = [];
      celula = "";
    } else {
      celula += c;
    }
  }
  if (celula || linha.length) {
    linha.push(celula);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((c) => c.trim()));
}

export type ResultadoImportacao = {
  questoes: QuestaoNova[];
  erros: { linha: number; mensagem: string }[];
};

export function importarQuestoesCsv(texto: string): ResultadoImportacao {
  const [cabecalho, ...linhas] = lerCsv(texto);
  if (!cabecalho) return { questoes: [], erros: [{ linha: 1, mensagem: "arquivo vazio" }] };

  const normalizar = (s: string) =>
    s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const indices = Object.fromEntries(cabecalho.map((nome, i) => [normalizar(nome), i]));
  const faltando = ["tipo", "enunciado", "gabarito"].filter((c) => !(c in indices));
  if (faltando.length) {
    return { questoes: [], erros: [{ linha: 1, mensagem: `colunas obrigatórias ausentes: ${faltando.join(", ")}` }] };
  }
  const valor = (linha: string[], coluna: string) =>
    coluna in indices ? (linha[indices[coluna]] ?? "") : "";

  const resultado: ResultadoImportacao = { questoes: [], erros: [] };
  linhas.forEach((linha, i) => {
    const validacao = validarQuestao({
      tipo: valor(linha, "tipo"),
      tema: valor(linha, "tema"),
      dificuldade: valor(linha, "dificuldade"),
      enunciado: valor(linha, "enunciado"),
      alternativas: ["a", "b", "c", "d", "e"].map((l) => valor(linha, l)),
      gabarito: valor(linha, "gabarito"),
      explicacao: valor(linha, "explicacao"),
      rubrica: valor(linha, "rubrica"),
      estilo: valor(linha, "estilo"),
    });
    if ("erro" in validacao) resultado.erros.push({ linha: i + 2, mensagem: validacao.erro });
    else resultado.questoes.push(validacao.questao);
  });
  return resultado;
}
