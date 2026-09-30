// Partes puras da geração de questões: instruções, pedido, formato de saída e conversão.

import { z } from "zod";
import { rubricaParaTexto, validarQuestao, type QuestaoNova } from "@/lib/questoes/questao";

export const MAX_QUESTOES_POR_GERACAO = 30;
export const MAX_CARDS_POR_GERACAO = 60;

export type ConfigGeracao = {
  objetivas: number;
  discursivas: number;
  /** Só quando a geração é de flashcards. */
  cards?: number;
  dificuldade: 1 | 2 | 3 | null; // null = variada
  tema: string;
  instrucoes: string;
};

export type TipoMaterial = "conteudo" | "prova";

export const QuestaoGeradaSchema = z.object({
  tipo: z.enum(["objetiva", "discursiva"]),
  tema: z.string(),
  dificuldade: z.number().int(),
  enunciado: z.string(),
  alternativas: z.array(z.string()),
  gabarito: z.string(),
  explicacao: z.string(),
  rubrica: z.array(z.object({ criterio: z.string(), pontos: z.number() })),
  fonte: z.string(),
});

export const SaidaGeracaoSchema = z.object({
  questoes: z.array(QuestaoGeradaSchema),
  observacoes: z.string(),
});

export type QuestaoGerada = z.infer<typeof QuestaoGeradaSchema>;

export const INSTRUCOES_GERACAO = `Você é professor de uma faculdade de Odontologia no Brasil e elabora questões de prova para alunos da graduação, a partir do material enviado pelo professor responsável.

Regras gerais:
- Baseie cada questão no material enviado. Não invente conteúdo que não esteja nele; se o material não tiver assunto suficiente para a quantidade pedida, gere menos questões e explique em "observacoes".
- Precisão clínica e científica acima de tudo. Use a terminologia técnica da Odontologia em português do Brasil.
- Escreva enunciados originais. Nunca copie frases longas do material nem reproduza questões de provas existentes.
- Varie os assuntos: cubra partes diferentes do material, sem repetir o mesmo conceito em duas questões, e sem repetir as questões que já existem no banco (lista enviada).
- Em "fonte", indique onde a questão se apoia no material (ex.: "Apostila de Endodontia, p. 12 — Irrigação"). Seja específico.
- Em "tema", use um nome curto de assunto (2 a 4 palavras), reaproveitando os temas já existentes quando fizer sentido.
- "dificuldade": 1 (fácil: memorização), 2 (média: compreensão e aplicação), 3 (difícil: caso clínico, análise ou integração de conceitos).

Questões objetivas:
- Exatamente 5 alternativas em "alternativas", na ordem A, B, C, D, E, sem as letras no texto.
- Apenas uma correta. Em "gabarito", só a letra (A a E). Distribua a letra correta entre as questões.
- Distratores plausíveis, do mesmo tamanho e estilo da correta. Evite "todas as anteriores", "nenhuma das anteriores" e pegadinhas de português.
- Em "explicacao", diga por que a correta está certa e por que as principais erradas estão erradas.
- "rubrica" vazia.

Questões discursivas:
- Pergunta que exija explicar, justificar ou descrever conduta — não só listar.
- "alternativas" vazia. Em "gabarito", a resposta esperada completa, como um professor escreveria.
- "rubrica" com 2 a 4 critérios objetivos e verificáveis, com pontos que somam 10.
- Em "explicacao", um comentário curto para o aluno ler depois de responder.`;

export function montarPedidoGeracao(params: {
  disciplina: string;
  tipoMaterial: TipoMaterial;
  config: ConfigGeracao;
  temasExistentes: string[];
  enunciadosExistentes: string[];
}): string {
  const { config } = params;
  const partes = [
    `Disciplina: ${params.disciplina}.`,
    `Gere ${config.objetivas} questões objetivas e ${config.discursivas} discursivas a partir do material acima.`,
    config.dificuldade
      ? `Dificuldade de todas as questões: ${config.dificuldade}.`
      : "Varie a dificuldade entre 1, 2 e 3, com a maioria no nível 2.",
  ];
  if (config.tema) partes.push(`Foque no tema: ${config.tema}.`);
  if (params.tipoMaterial === "prova") {
    partes.push(
      "Atenção: o material é uma prova antiga de universidade. Use-a SOMENTE como referência dos assuntos cobrados, do nível e do estilo. Não copie nem parafraseie as questões dela — crie questões novas sobre os mesmos assuntos.",
    );
  }
  if (config.instrucoes) {
    partes.push(`Orientações do professor:\n<orientacoes>\n${config.instrucoes}\n</orientacoes>`);
  }
  if (params.temasExistentes.length) {
    partes.push(`Temas já usados no banco: ${params.temasExistentes.join("; ")}.`);
  }
  if (params.enunciadosExistentes.length) {
    partes.push(
      `Questões que já existem no banco (não repita):\n<existentes>\n${params.enunciadosExistentes
        .map((e) => `- ${e}`)
        .join("\n")}\n</existentes>`,
    );
  }
  return partes.join("\n\n");
}

/** Converte o que a IA gerou em questões válidas para o banco; descarta as inválidas. */
export function converterQuestoesGeradas(geradas: QuestaoGerada[]): {
  questoes: (QuestaoNova & { fonte: string })[];
  descartadas: { enunciado: string; motivo: string }[];
} {
  const questoes: (QuestaoNova & { fonte: string })[] = [];
  const descartadas: { enunciado: string; motivo: string }[] = [];

  for (const g of geradas) {
    const validacao = validarQuestao({
      tipo: g.tipo,
      tema: g.tema,
      dificuldade: String(g.dificuldade),
      enunciado: g.enunciado,
      alternativas: g.tipo === "objetiva" ? g.alternativas.map((a) => a.replace(/^\s*[A-Ea-e][).:-]\s+/, "")) : [],
      gabarito: g.gabarito.trim().replace(/[).]$/, ""),
      explicacao: g.explicacao,
      rubrica: rubricaParaTexto(g.rubrica),
    });
    if ("erro" in validacao) {
      descartadas.push({ enunciado: g.enunciado.slice(0, 120), motivo: validacao.erro });
    } else {
      questoes.push({ ...validacao.questao, fonte: g.fonte.trim().slice(0, 300) });
    }
  }
  return { questoes, descartadas };
}

// -----------------------------------------------------------------------------
// Flashcards
// -----------------------------------------------------------------------------

export const SaidaFlashcardsSchema = z.object({
  cards: z.array(z.object({ frente: z.string(), verso: z.string(), fonte: z.string() })),
  observacoes: z.string(),
});

export const INSTRUCOES_FLASHCARDS = `Você é professor de uma faculdade de Odontologia no Brasil e cria flashcards de revisão para alunos da graduação, a partir do material enviado pelo professor responsável.

Regras:
- Baseie cada card no material enviado. Não invente conteúdo que não esteja nele; se o material não render a quantidade pedida, crie menos e explique em "observacoes".
- Um conceito por card. Frente: uma pergunta direta ou um termo a definir (até ~20 palavras). Verso: a resposta objetiva (até ~50 palavras), só o essencial para memorizar.
- Priorize o que costuma cair em prova: definições, classificações, indicações e contraindicações, valores de referência, sequências de técnica, diferenças entre conceitos parecidos.
- Frente e verso precisam fazer sentido sozinhos, sem depender de outros cards ("qual a segunda etapa?" não serve).
- Precisão clínica e científica acima de tudo. Terminologia técnica da Odontologia em português do Brasil. Não copie frases longas do material.
- Não repita cards que já existem no deck (lista enviada) nem crie dois cards sobre o mesmo ponto.
- Em "fonte", indique onde o card se apoia no material (ex.: "Apostila, p. 12").`;

export function montarPedidoFlashcards(params: {
  disciplina: string;
  deck: string;
  tipoMaterial: TipoMaterial;
  config: ConfigGeracao;
  frentesExistentes: string[];
}): string {
  const { config } = params;
  const partes = [
    `Disciplina: ${params.disciplina}. Deck: ${params.deck}.`,
    `Crie ${config.cards ?? 20} flashcards a partir do material acima.`,
  ];
  if (config.tema) partes.push(`Foque no tema: ${config.tema}.`);
  if (params.tipoMaterial === "prova") {
    partes.push(
      "O material é uma prova antiga: use-a só para identificar os assuntos cobrados e crie cards sobre esses assuntos, sem copiar as questões.",
    );
  }
  if (config.instrucoes) {
    partes.push(`Orientações do professor:\n<orientacoes>\n${config.instrucoes}\n</orientacoes>`);
  }
  if (params.frentesExistentes.length) {
    partes.push(
      `Cards que já existem no deck (não repita):\n<existentes>\n${params.frentesExistentes
        .map((f) => `- ${f}`)
        .join("\n")}\n</existentes>`,
    );
  }
  return partes.join("\n\n");
}
