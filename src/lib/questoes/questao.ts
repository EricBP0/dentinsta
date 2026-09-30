// Validação de questões — usada no formulário do backoffice e na importação por planilha.

import type { CriterioRubrica } from "@/lib/ia/rubrica";

export type TipoQuestao = "objetiva" | "discursiva";
export type Alternativa = { letra: string; texto: string };

export type QuestaoNova = {
  tipo: TipoQuestao;
  tema: string;
  dificuldade: 1 | 2 | 3;
  enunciado: string;
  alternativas: Alternativa[];
  gabarito: string;
  explicacao: string;
  rubrica: CriterioRubrica[];
  estilo: string;
};

export const LETRAS = ["A", "B", "C", "D", "E"] as const;

export const NOME_DIFICULDADE: Record<1 | 2 | 3, string> = { 1: "Fácil", 2: "Média", 3: "Difícil" };

export function lerDificuldade(valor: string): 1 | 2 | 3 | null {
  const v = valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (["", "2", "media", "medio"].includes(v)) return 2;
  if (["1", "facil"].includes(v)) return 1;
  if (["3", "dificil"].includes(v)) return 3;
  return null;
}

/** "Cita o hipoclorito: 2 | Explica a ação: 3" → [{criterio, pontos}, ...] */
export function lerRubrica(texto: string): CriterioRubrica[] {
  return texto
    .split(/\||\n/)
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => {
      const m = parte.match(/^(.*?)[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:pts?|pontos?)?$/i);
      return m
        ? { criterio: m[1].trim(), pontos: Number(m[2].replace(",", ".")) }
        : { criterio: parte, pontos: 1 };
    })
    .filter((c) => c.criterio && c.pontos > 0);
}

export function rubricaParaTexto(rubrica: CriterioRubrica[]): string {
  return rubrica.map((c) => `${c.criterio}: ${c.pontos}`).join("\n");
}

type Entrada = {
  tipo: string;
  tema?: string;
  dificuldade?: string;
  enunciado: string;
  alternativas: string[]; // textos de A a E, vazios são ignorados
  gabarito: string;
  explicacao?: string;
  rubrica?: string;
  estilo?: string;
};

export function validarQuestao(entrada: Entrada): { questao: QuestaoNova } | { erro: string } {
  const tipo = entrada.tipo.trim().toLowerCase();
  if (tipo !== "objetiva" && tipo !== "discursiva") {
    return { erro: `tipo deve ser "objetiva" ou "discursiva" (recebido: "${entrada.tipo}")` };
  }
  const enunciado = entrada.enunciado.trim();
  if (!enunciado) return { erro: "enunciado vazio" };

  const dificuldade = lerDificuldade(entrada.dificuldade ?? "");
  if (!dificuldade) return { erro: `dificuldade inválida: "${entrada.dificuldade}" (use 1, 2 ou 3)` };

  let alternativas: Alternativa[] = [];
  let gabarito = entrada.gabarito.trim();

  if (tipo === "objetiva") {
    alternativas = entrada.alternativas
      .map((texto, i) => ({ letra: LETRAS[i], texto: texto.trim() }))
      .filter((a) => a.letra && a.texto);
    if (alternativas.length < 2) return { erro: "objetiva precisa de pelo menos 2 alternativas" };
    gabarito = gabarito.toUpperCase();
    if (!alternativas.some((a) => a.letra === gabarito)) {
      return { erro: `gabarito "${entrada.gabarito}" não corresponde a nenhuma alternativa preenchida` };
    }
  } else if (!gabarito && !entrada.rubrica?.trim()) {
    return { erro: "discursiva precisa de gabarito ou rubrica" };
  }

  return {
    questao: {
      tipo,
      tema: entrada.tema?.trim() ?? "",
      dificuldade,
      enunciado,
      alternativas,
      gabarito,
      explicacao: entrada.explicacao?.trim() ?? "",
      rubrica: tipo === "discursiva" ? lerRubrica(entrada.rubrica ?? "") : [],
      estilo: entrada.estilo?.trim() ?? "",
    },
  };
}
