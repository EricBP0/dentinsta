// Regras do ClinicaON que não dependem do banco: valores, datas e rótulos.
// Tudo no horário de Brasília (UTC-3, sem horário de verão desde 2019).

export const TIPOS_CONSULTA = {
  avaliacao: { nome: "Avaliação", emoji: "🩺" },
  retorno: { nome: "Retorno", emoji: "🔄" },
  cirurgia: { nome: "Cirurgia", emoji: "🔪" },
  reuniao: { nome: "Reunião", emoji: "👥" },
  compromisso: { nome: "Compromisso", emoji: "📅" },
  especial: { nome: "Especial", emoji: "⭐" },
} as const;
export type TipoConsulta = keyof typeof TIPOS_CONSULTA;

export const STATUS_CONSULTA = {
  agendada: "Agendada",
  finalizada: "Finalizada",
  faltou: "Faltou",
  cancelada: "Cancelada",
} as const;
export type StatusConsulta = keyof typeof STATUS_CONSULTA;

export function ehTipoConsulta(valor: string): valor is TipoConsulta {
  return valor in TIPOS_CONSULTA;
}

export function ehStatusConsulta(valor: string): valor is StatusConsulta {
  return valor in STATUS_CONSULTA;
}

/**
 * "23.450" / "23.450,00" / "23450" / "2500,5" / "R$ 1.234,56" → centavos.
 * Com vírgula, ela é a casa decimal e os pontos separam milhar. Sem vírgula, um
 * ponto seguido de 1 ou 2 dígitos no fim é decimal; os demais separam milhar.
 */
export function reaisParaCentavos(valor: string): number | null {
  let texto = valor.replace(/r\$|\s/gi, "");
  if (!texto) return null;
  if (texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (/\.\d{1,2}$/.test(texto) && (texto.match(/\./g) ?? []).length === 1) {
    // "2500.5" ou "10.99": decimal
  } else {
    texto = texto.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return null;
  const centavos = Math.round(Number(texto) * 100);
  return Number.isSafeInteger(centavos) ? centavos : null;
}

/** Data de hoje (AAAA-MM-DD) em Brasília. */
export function hojeBrasilia(agora: Date = new Date()): string {
  return new Date(agora.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function diaValido(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`));
}

export function mesValido(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);
}

/** Soma dias a uma data AAAA-MM-DD. */
export function somarDias(dia: string, dias: number): string {
  const data = new Date(`${dia}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

/** Os 7 dias (segunda a domingo) da semana que contém `dia`. */
export function semanaDe(dia: string): string[] {
  const semana = new Date(`${dia}T00:00:00Z`).getUTCDay(); // 0 = domingo
  const segunda = somarDias(dia, semana === 0 ? -6 : 1 - semana);
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}

/** Soma meses a "AAAA-MM". */
export function somarMeses(mes: string, meses: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const data = new Date(Date.UTC(ano, m - 1 + meses, 1));
  return data.toISOString().slice(0, 7);
}

/** Primeiro e último dia (AAAA-MM-DD) do mês. */
export function limitesDoMes(mes: string): { inicio: string; fim: string } {
  return { inicio: `${mes}-01`, fim: somarDias(`${somarMeses(mes, 1)}-01`, -1) };
}

/** Semanas (domingo a sábado) para o calendário do mês; dias de fora vêm como null. */
export function gradeDoMes(mes: string): (string | null)[][] {
  const { inicio, fim } = limitesDoMes(mes);
  const vazios = new Date(`${inicio}T00:00:00Z`).getUTCDay();
  const dias: (string | null)[] = Array(vazios).fill(null);
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) dias.push(d);
  while (dias.length % 7) dias.push(null);
  return Array.from({ length: dias.length / 7 }, (_, i) => dias.slice(i * 7, i * 7 + 7));
}

/** Data e hora de Brasília → ISO em UTC. */
export function inicioConsulta(dia: string, hora: string): string | null {
  if (!diaValido(dia) || !/^\d{2}:\d{2}$/.test(hora)) return null;
  const data = new Date(`${dia}T${hora}:00-03:00`);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

/** Limites em UTC (ISO) de um intervalo de dias de Brasília, fim exclusivo. */
export function intervaloUtc(primeiroDia: string, ultimoDia: string): { de: string; ate: string } {
  return {
    de: new Date(`${primeiroDia}T00:00:00-03:00`).toISOString(),
    ate: new Date(`${somarDias(ultimoDia, 1)}T00:00:00-03:00`).toISOString(),
  };
}

/** ISO → { dia, hora } em Brasília. */
export function partesBrasilia(iso: string): { dia: string; hora: string } {
  const local = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000).toISOString();
  return { dia: local.slice(0, 10), hora: local.slice(11, 16) };
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function nomeDoMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} de ${ano}`;
}

export function diaPorExtenso(dia: string): string {
  const data = new Date(`${dia}T00:00:00Z`);
  return `${SEMANA[data.getUTCDay()]}, ${data.getUTCDate()} de ${MESES[data.getUTCMonth()]}`;
}

export function diaDaSemana(dia: string): string {
  return SEMANA[new Date(`${dia}T00:00:00Z`).getUTCDay()];
}

export function diaCurto(dia: string): string {
  const [, m, d] = dia.split("-");
  return `${d}/${m}`;
}
