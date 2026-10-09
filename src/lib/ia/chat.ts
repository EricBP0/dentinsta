import "server-only";
import { conversar } from "./provedores";

/** Perguntas por dia (horário de Brasília) para cada aluno com a IA ativa. */
export function limiteDiarioChat(): number {
  const valor = Number(process.env.IA_CHAT_LIMITE_DIARIO);
  return Number.isInteger(valor) && valor > 0 ? valor : 10;
}

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

export type MensagemChat = { papel: "user" | "assistant"; conteudo: string };

/**
 * Abre a resposta em partes. Os modelos (e a ordem de reserva) vêm de IA_CHAT
 * (src/lib/ia/provedores/config.ts): se um falhar ou recusar antes de
 * responder, o próximo assume.
 */
export function responderChat(historico: MensagemChat[]) {
  return conversar({ sistema: INSTRUCOES, historico, maxTokens: 8000 });
}

/** Título da conversa a partir da primeira pergunta. */
export function tituloDaConversa(pergunta: string): string {
  const limpo = pergunta.replace(/\s+/g, " ").trim();
  return limpo.length > 60 ? `${limpo.slice(0, 57)}…` : limpo;
}
