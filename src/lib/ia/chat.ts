import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** Perguntas por dia (horário de Brasília) para cada aluno com a IA ativa. */
export function limiteDiarioChat(): number {
  const valor = Number(process.env.IA_CHAT_LIMITE_DIARIO);
  return Number.isInteger(valor) && valor > 0 ? valor : 10;
}

export const MODELO_CHAT = process.env.IA_MODELO_CHAT || "claude-opus-5-5";
export const TAMANHO_MAXIMO_PERGUNTA = 4000;
/** Quantas mensagens anteriores da conversa vão junto com a pergunta. */
export const MENSAGENS_DE_CONTEXTO = 20;

const INSTRUCOES = `Você é o assistente de estudos da OdontoLab, uma plataforma para estudantes de Odontologia no Brasil.
Responda dúvidas de Odontologia e das ciências básicas ligadas a ela (anatomia, histologia, fisiologia, bioquímica, farmacologia, patologia, materiais, clínica, saúde coletiva, odontologia legal etc.).

Como responder:
- Em português do Brasil, com a terminologia usada nas faculdades brasileiras.
- Direto ao ponto e didático, como um professor que explica para a prova. Comece pela resposta e depois explique.
- Use listas curtas e **negrito** para os termos-chave quando ajudar. Evite tabelas e títulos longos.
- Quando houver divergência entre autores ou protocolos, diga isso.
- Doses e condutas clínicas são para estudo: lembre que a conduta real depende da avaliação do paciente e do professor/supervisor.
- Se a pergunta não for de Odontologia ou da área da saúde ligada a ela, diga com gentileza que só ajuda com dúvidas de Odontologia.
- Não invente referências. Se não souber, diga que não sabe.`;

let cliente: Anthropic | null = null;
function anthropic() {
  cliente ??= new Anthropic();
  return cliente;
}

export type MensagemChat = { papel: "user" | "assistant"; conteudo: string };

/** Abre o streaming da resposta. Se o modelo recusar por engano, a API tenta outro modelo. */
export function responderChat(historico: MensagemChat[]) {
  return anthropic().beta.messages.stream({
    model: MODELO_CHAT,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    cache_control: { type: "ephemeral" },
    system: INSTRUCOES,
    messages: historico.map((m) => ({ role: m.papel, content: m.conteudo })),
  });
}

/** Título da conversa a partir da primeira pergunta. */
export function tituloDaConversa(pergunta: string): string {
  const limpo = pergunta.replace(/\s+/g, " ").trim();
  return limpo.length > 60 ? `${limpo.slice(0, 57)}…` : limpo;
}
