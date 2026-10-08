// Contagem da cota diária do chat (horário de Brasília). Sem "server-only": a
// página do aluno e a rota usam, e os testes também.

/** Início do dia de hoje no horário de Brasília (UTC-3), em UTC. */
export function inicioDoDia(agora: Date = new Date()): Date {
  const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return new Date(Date.UTC(brasilia.getUTCFullYear(), brasilia.getUTCMonth(), brasilia.getUTCDate(), 3, 0, 0));
}
