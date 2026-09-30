// Repetição espaçada (variação do SM-2, parecida com a do Anki).
// O aluno avalia cada card: errei, difícil, bom ou fácil. Quanto melhor a
// avaliação, mais tempo até o card voltar.

export type Avaliacao = "errei" | "dificil" | "bom" | "facil";

export type EstadoCard = {
  facilidade: number;
  intervaloDias: number;
  repeticoes: number;
  lapsos: number;
};

export const ESTADO_INICIAL: EstadoCard = { facilidade: 2.5, intervaloDias: 0, repeticoes: 0, lapsos: 0 };

const FACILIDADE_MIN = 1.3;
const FACILIDADE_MAX = 3.0;
const INTERVALO_MAX_DIAS = 365;
/** Card errado volta na mesma sessão, depois de alguns minutos. */
export const MINUTOS_APOS_ERRO = 10;

function limitar(valor: number, min: number, max: number) {
  return Math.min(Math.max(valor, min), max);
}

export function proximoEstado(estado: EstadoCard, avaliacao: Avaliacao): EstadoCard {
  const { facilidade, intervaloDias, repeticoes, lapsos } = estado;

  if (avaliacao === "errei") {
    return {
      facilidade: limitar(facilidade - 0.2, FACILIDADE_MIN, FACILIDADE_MAX),
      intervaloDias: 0,
      repeticoes: 0,
      lapsos: repeticoes > 0 ? lapsos + 1 : lapsos,
    };
  }

  let intervalo: number;
  let novaFacilidade = facilidade;
  if (avaliacao === "dificil") {
    intervalo = repeticoes === 0 ? 1 : intervaloDias * 1.2;
    novaFacilidade -= 0.15;
  } else if (avaliacao === "bom") {
    intervalo = repeticoes === 0 ? 1 : repeticoes === 1 ? 3 : intervaloDias * facilidade;
  } else {
    intervalo = repeticoes === 0 ? 4 : Math.max(intervaloDias * facilidade * 1.3, 4);
    novaFacilidade += 0.15;
  }

  return {
    facilidade: Math.round(limitar(novaFacilidade, FACILIDADE_MIN, FACILIDADE_MAX) * 100) / 100,
    // Sempre avança pelo menos 1 dia além do intervalo anterior (exceto "difícil" no começo).
    intervaloDias: limitar(Math.round(Math.max(intervalo, avaliacao === "dificil" ? 1 : intervaloDias + 1)), 1, INTERVALO_MAX_DIAS),
    repeticoes: repeticoes + 1,
    lapsos,
  };
}

export function dataProximaRevisao(estado: EstadoCard, agora: Date = new Date()): Date {
  if (estado.intervaloDias === 0) return new Date(agora.getTime() + MINUTOS_APOS_ERRO * 60 * 1000);
  return new Date(agora.getTime() + estado.intervaloDias * 24 * 60 * 60 * 1000);
}

/** Texto do botão: quanto tempo até o card voltar se o aluno escolher esta avaliação. */
export function rotuloIntervalo(estado: EstadoCard, avaliacao: Avaliacao): string {
  const dias = proximoEstado(estado, avaliacao).intervaloDias;
  if (avaliacao === "errei") return `${MINUTOS_APOS_ERRO} min`;
  if (dias === 1) return "1 dia";
  if (dias < 30) return `${dias} dias`;
  const meses = Math.round(dias / 30);
  return meses === 1 ? "1 mês" : `${meses} meses`;
}
