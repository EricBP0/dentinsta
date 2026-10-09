import "server-only";
import { z } from "zod";
import { gerarEstruturado, RecusaIA } from "./provedores";
import {
  INSTRUCOES_CORRECAO,
  montarFeedback,
  montarMensagemCorrecao,
  type Feedback,
  type QuestaoParaCorrecao,
} from "./rubrica";

const AvaliacaoSchema = z.object({
  criterios: z.array(
    z.object({
      indice: z.number().int(),
      pontos_obtidos: z.number(),
      comentario: z.string(),
    }),
  ),
  comentario_geral: z.string(),
  faltou: z.array(z.string()),
});

// Os modelos (e a ordem de reserva) vêm de IA_CORRECAO; o esforço, de IA_EFFORT
// (src/lib/ia/provedores/config.ts). Compare custo x qualidade com respostas
// reais corrigidas pelo professor (docs/PLANEJAMENTO.md, seção 6.3).

export type ResultadoCorrecao = {
  nota: number;
  feedback: Feedback;
  modelo: string;
  uso: { entrada: number; saida: number; cache: number };
};

/** Todos os modelos da lista recusaram. */
export class CorrecaoRecusada extends Error {}

export async function corrigirDiscursiva(
  questao: QuestaoParaCorrecao,
  resposta: string,
): Promise<ResultadoCorrecao> {
  try {
    const resultado = await gerarEstruturado("correcao", {
      sistema: INSTRUCOES_CORRECAO,
      partes: [{ tipo: "texto", texto: montarMensagemCorrecao(questao, resposta) }],
      schema: AvaliacaoSchema,
      maxTokens: 8000,
    });
    const { nota, feedback } = montarFeedback(questao.rubrica, resultado.dados);
    return { nota, feedback, modelo: resultado.modelo, uso: resultado.uso };
  } catch (erro) {
    if (erro instanceof RecusaIA) throw new CorrecaoRecusada(erro.message);
    throw erro;
  }
}
