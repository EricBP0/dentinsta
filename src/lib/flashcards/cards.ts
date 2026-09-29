// Validação e importação de flashcards (planilha e IA).

import { lerCsv } from "@/lib/questoes/csv";

export type CardNovo = { frente: string; verso: string; imagem_url: string | null; fonte: string };

export const LIMITE_FRENTE = 2000;
export const LIMITE_VERSO = 4000;

function urlValida(valor: string): string | null {
  if (!valor.trim()) return null;
  try {
    const url = new URL(valor.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function validarCard(entrada: {
  frente: string;
  verso: string;
  imagem_url?: string;
  fonte?: string;
}): { card: CardNovo } | { erro: string } {
  const frente = entrada.frente.trim();
  const verso = entrada.verso.trim();
  if (!frente) return { erro: "frente vazia" };
  if (!verso) return { erro: "verso vazio" };
  if (frente.length > LIMITE_FRENTE) return { erro: `frente com mais de ${LIMITE_FRENTE} caracteres` };
  if (verso.length > LIMITE_VERSO) return { erro: `verso com mais de ${LIMITE_VERSO} caracteres` };
  if (entrada.imagem_url?.trim() && !urlValida(entrada.imagem_url)) return { erro: "imagem_url inválida" };
  return {
    card: { frente, verso, imagem_url: urlValida(entrada.imagem_url ?? ""), fonte: entrada.fonte?.trim() ?? "" },
  };
}

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Remove cards cuja frente já existe no deck (ou repetida na mesma leva). */
export function removerRepetidos(cards: CardNovo[], frentesExistentes: string[]) {
  const vistas = new Set(frentesExistentes.map(normalizar));
  const unicos: CardNovo[] = [];
  let repetidos = 0;
  for (const card of cards) {
    const chave = normalizar(card.frente);
    if (vistas.has(chave)) {
      repetidos++;
      continue;
    }
    vistas.add(chave);
    unicos.push(card);
  }
  return { unicos, repetidos };
}

/** Planilha com colunas frente;verso (e imagem_url opcional). Sem cabeçalho também funciona. */
export function importarCardsCsv(texto: string): { cards: CardNovo[]; erros: { linha: number; mensagem: string }[] } {
  const linhas = lerCsv(texto);
  if (!linhas.length) return { cards: [], erros: [{ linha: 1, mensagem: "arquivo vazio" }] };

  const cabecalho = linhas[0].map((c) => normalizar(c));
  const temCabecalho = cabecalho.includes("frente") && cabecalho.includes("verso");
  const iFrente = temCabecalho ? cabecalho.indexOf("frente") : 0;
  const iVerso = temCabecalho ? cabecalho.indexOf("verso") : 1;
  const iImagem = temCabecalho ? cabecalho.findIndex((c) => c === "imagem url" || c === "imagem") : 2;

  const cards: CardNovo[] = [];
  const erros: { linha: number; mensagem: string }[] = [];
  linhas.slice(temCabecalho ? 1 : 0).forEach((linha, i) => {
    const validacao = validarCard({
      frente: linha[iFrente] ?? "",
      verso: linha[iVerso] ?? "",
      imagem_url: iImagem >= 0 ? (linha[iImagem] ?? "") : "",
    });
    const numero = i + (temCabecalho ? 2 : 1);
    if ("erro" in validacao) erros.push({ linha: numero, mensagem: validacao.erro });
    else cards.push(validacao.card);
  });
  return { cards, erros };
}
