import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
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

const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORTS)[number];

// Modelo e esforço são configuráveis para comparar custo x qualidade com
// respostas reais corrigidas pelo professor (docs/PLANEJAMENTO.md, seção 6.3).
export const MODELO_CORRECAO = process.env.IA_MODELO || "claude-opus-5-5";
const EFFORT_CORRECAO: Effort = EFFORTS.includes(process.env.IA_EFFORT as Effort)
  ? (process.env.IA_EFFORT as Effort)
  : "low";

let cliente: Anthropic | null = null;
function anthropic() {
  cliente ??= new Anthropic();
  return cliente;
}

export type ResultadoCorrecao = {
  nota: number;
  feedback: Feedback;
  modelo: string;
  uso: { entrada: number; saida: number; cache: number };
};

export class CorrecaoRecusada extends Error {}

export async function corrigirDiscursiva(
  questao: QuestaoParaCorrecao,
  resposta: string,
): Promise<ResultadoCorrecao> {
  const response = await anthropic().beta.messages.parse({
    model: MODELO_CORRECAO,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    // Se o modelo recusar por engano (ex.: termos clínicos), a API tenta outro modelo.
    fallbacks: "default",
    system: INSTRUCOES_CORRECAO,
    output_config: {
      effort: EFFORT_CORRECAO,
      format: betaZodOutputFormat(AvaliacaoSchema),
    },
    messages: [{ role: "user", content: montarMensagemCorrecao(questao, resposta) }],
  });

  if (response.stop_reason === "refusal") {
    throw new CorrecaoRecusada(response.stop_details?.explanation ?? "correção recusada");
  }
  if (!response.parsed_output) {
    throw new Error(`resposta da IA inválida (stop_reason: ${response.stop_reason})`);
  }

  const { nota, feedback } = montarFeedback(questao.rubrica, response.parsed_output);
  return {
    nota,
    feedback,
    modelo: response.model,
    uso: {
      entrada: response.usage.input_tokens,
      saida: response.usage.output_tokens,
      cache: response.usage.cache_read_input_tokens ?? 0,
    },
  };
}
