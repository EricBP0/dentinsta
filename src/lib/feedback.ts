// Feedback dos alunos: categorias, status e validação (puros, testáveis).

export const CATEGORIAS_FEEDBACK = {
  sugestao: "Sugestão",
  problema: "Problema ou erro",
  conteudo: "Conteúdo",
  elogio: "Elogio",
  outro: "Outro assunto",
} as const;
export type CategoriaFeedback = keyof typeof CATEGORIAS_FEEDBACK;

export const STATUS_FEEDBACK = {
  aberto: "Aguardando a equipe",
  respondido: "Respondido",
  arquivado: "Encerrado",
} as const;
export type StatusFeedback = keyof typeof STATUS_FEEDBACK;
/** Cor do <Selo> do backoffice para cada status. */
export const SELO_FEEDBACK: Record<StatusFeedback, string> = { aberto: "em_breve", respondido: "publicada", arquivado: "arquivada" };

export const MENSAGEM_MIN = 10;
export const MENSAGEM_MAX = 4000;

export type Feedback = {
  id: string;
  categoria: CategoriaFeedback;
  /** Primeira mensagem do aluno; as seguintes ficam em feedback_mensagens. */
  mensagem: string;
  status: StatusFeedback;
  /** false: há mensagem da equipe que o aluno ainda não viu. */
  resposta_vista: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type MensagemFeedback = { id: string; feedback_id: string; da_equipe: boolean; texto: string; criado_em: string };

export const COLUNAS_FEEDBACK = "id, categoria, mensagem, status, resposta_vista, criado_em, atualizado_em";
export const COLUNAS_MENSAGEM = "id, feedback_id, da_equipe, texto, criado_em";

/** A conversa inteira, começando pela mensagem que abriu o feedback. */
export function montarConversa(feedback: Feedback, mensagens: MensagemFeedback[]): MensagemFeedback[] {
  const abertura = { id: feedback.id, feedback_id: feedback.id, da_equipe: false, texto: feedback.mensagem, criado_em: feedback.criado_em };
  return [abertura, ...mensagens.filter((m) => m.feedback_id === feedback.id).sort((a, b) => a.criado_em.localeCompare(b.criado_em))];
}

/** Erros do banco (enviar_mensagem_feedback e limites) em texto para o usuário. */
export function erroDeEnvio(mensagemDoBanco: string): string {
  if (mensagemDoBanco.includes("conversa_encerrada"))
    return "Esta conversa foi encerrada pela equipe. Se precisar, mande um novo feedback.";
  if (mensagemDoBanco.includes("limite_mensagens") || mensagemDoBanco.includes("limite_feedbacks"))
    return "Você enviou muitas mensagens em pouco tempo. Tente de novo mais tarde.";
  if (mensagemDoBanco.includes("mensagem_invalida")) return `Escreva entre 1 e ${MENSAGEM_MAX} caracteres.`;
  if (mensagemDoBanco.includes("feedback_nao_encontrado")) return "Conversa não encontrada.";
  return "Não foi possível enviar agora. Tente de novo em instantes.";
}

export function ehCategoria(valor: string): valor is CategoriaFeedback {
  return valor in CATEGORIAS_FEEDBACK;
}

export function ehStatus(valor: string): valor is StatusFeedback {
  return valor in STATUS_FEEDBACK;
}

/** Confere categoria e mensagem do formulário. */
export function validarFeedback(
  categoria: string,
  mensagem: string,
): { ok: true; categoria: CategoriaFeedback; mensagem: string } | { ok: false; erro: string } {
  if (!ehCategoria(categoria)) return { ok: false, erro: "Escolha o assunto do feedback." };
  const texto = mensagem.trim();
  if (texto.length < MENSAGEM_MIN) return { ok: false, erro: `Escreva pelo menos ${MENSAGEM_MIN} caracteres.` };
  if (texto.length > MENSAGEM_MAX) return { ok: false, erro: `Use no máximo ${MENSAGEM_MAX} caracteres.` };
  return { ok: true, categoria, mensagem: texto };
}

/** Retorno das actions de mensagem (useActionState). */
export type EstadoMensagem = { erro?: string; enviado?: number };
