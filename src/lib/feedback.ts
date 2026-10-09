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
  aberto: "Aguardando resposta",
  respondido: "Respondido",
  arquivado: "Arquivado",
} as const;
export type StatusFeedback = keyof typeof STATUS_FEEDBACK;

export const MENSAGEM_MIN = 10;
export const MENSAGEM_MAX = 4000;

export type Feedback = {
  id: string;
  categoria: CategoriaFeedback;
  mensagem: string;
  status: StatusFeedback;
  resposta: string | null;
  respondido_em: string | null;
  resposta_vista: boolean;
  criado_em: string;
};

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
