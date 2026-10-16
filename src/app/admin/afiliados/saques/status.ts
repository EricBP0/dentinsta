import type { NivelConferencia } from "@/lib/afiliados";

export const STATUS_SAQUE: Record<string, { selo: string; texto: string }> = {
  solicitado: { selo: "em_breve", texto: "Para analisar" },
  transferindo: { selo: "em_breve", texto: "Pix em andamento" },
  pago: { selo: "publicada", texto: "Pago" },
  falhou: { selo: "arquivada", texto: "Pix falhou" },
  recusado: { selo: "rascunho", texto: "Recusado" },
};

export const NIVEL: Record<NivelConferencia, { selo: string; texto: string }> = {
  ok: { selo: "publicada", texto: "OK" },
  alerta: { selo: "em_breve", texto: "Alerta" },
  bloqueio: { selo: "arquivada", texto: "Bloqueado" },
};
