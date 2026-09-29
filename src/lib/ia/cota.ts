// Cota mensal de correções discursivas por aluno (docs/PLANEJAMENTO.md, seção 6.3).

export function cotaMensal(): number {
  const valor = Number(process.env.IA_COTA_MENSAL);
  return Number.isInteger(valor) && valor > 0 ? valor : 60;
}

/** Início do mês corrente no horário de Brasília (UTC-3), em UTC. */
export function inicioDoMes(agora: Date = new Date()): Date {
  const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return new Date(Date.UTC(brasilia.getUTCFullYear(), brasilia.getUTCMonth(), 1, 3, 0, 0));
}
