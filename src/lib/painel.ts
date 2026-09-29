// Cálculos do painel do aluno (puros, testáveis).

const DIA_MS = 24 * 60 * 60 * 1000;

/** Data (AAAA-MM-DD) no horário de Brasília. */
export function diaBrasilia(data: Date): string {
  return new Date(data.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Últimos `quantidade` dias (AAAA-MM-DD), do mais antigo para hoje. */
export function ultimosDias(quantidade: number, hoje: Date = new Date()): string[] {
  const fim = new Date(`${diaBrasilia(hoje)}T00:00:00Z`).getTime();
  return Array.from({ length: quantidade }, (_, i) =>
    new Date(fim - (quantidade - 1 - i) * DIA_MS).toISOString().slice(0, 10),
  );
}

/**
 * Dias seguidos estudando (pelo menos `minimoSegundos`), terminando hoje. Se hoje
 * ainda não teve estudo, a sequência de ontem continua valendo.
 */
export function sequenciaDeDias(
  tempoPorDia: Record<string, number>,
  hoje: Date = new Date(),
  minimoSegundos = 60,
): number {
  const estudou = (dia: string) => (tempoPorDia[dia] ?? 0) >= minimoSegundos;
  const dias = ultimosDias(366, hoje).reverse(); // hoje, ontem, ...
  const inicio = estudou(dias[0]) ? 0 : 1;
  let sequencia = 0;
  for (let i = inicio; i < dias.length && estudou(dias[i]); i++) sequencia++;
  return sequencia;
}

export type NotaSimulado = { nota: number; finalizado_em: string };

/** Média das notas no período [agora - dias, agora) e a variação contra o período anterior. */
export function mediaComVariacao(
  notas: NotaSimulado[],
  dias: number,
  agora: Date = new Date(),
): { media: number | null; anterior: number | null; variacao: number | null; quantidade: number } {
  const t = agora.getTime();
  const noPeriodo = (inicio: number, fim: number) =>
    notas.filter((n) => {
      const quando = new Date(n.finalizado_em).getTime();
      return quando >= inicio && quando < fim;
    });
  const media = (lista: NotaSimulado[]) =>
    lista.length ? Math.round((lista.reduce((s, n) => s + n.nota, 0) / lista.length) * 10) / 10 : null;

  const atual = noPeriodo(t - dias * DIA_MS, t + 1);
  const anterior = noPeriodo(t - 2 * dias * DIA_MS, t - dias * DIA_MS);
  const mAtual = media(atual);
  const mAnterior = media(anterior);
  return {
    media: mAtual,
    anterior: mAnterior,
    variacao: mAtual !== null && mAnterior !== null ? Math.round((mAtual - mAnterior) * 10) / 10 : null,
    quantidade: atual.length,
  };
}

export function formatarDuracao(segundos: number): string {
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas}h ${resto}min` : `${horas}h`;
}

export type DesempenhoTema = { disciplina: string; tema: string; respondidas: number; media: number };

/** Temas para reforçar: pelo menos `minimo` respostas, piores médias primeiro. */
export function temasParaReforcar(temas: DesempenhoTema[], minimo = 3, limite = 5): DesempenhoTema[] {
  return temas
    .filter((t) => t.respondidas >= minimo)
    .sort((a, b) => a.media - b.media || b.respondidas - a.respondidas)
    .slice(0, limite);
}
