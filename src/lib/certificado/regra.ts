// Certificado: 100% dos itens obrigatórios concluídos (docs/PLANEJAMENTO.md, seção 3).
// Itens bloqueados ("renove") não contam — senão o aluno nunca completaria.

export type ItemParaCertificado = {
  id: string;
  obrigatorio: boolean;
  liberado: boolean;
};

export type ProgressoObrigatorio = {
  total: number;
  concluidos: number;
  completo: boolean;
};

export function progressoObrigatorio(
  itens: ItemParaCertificado[],
  concluidos: ReadonlySet<string>,
): ProgressoObrigatorio {
  const obrigatorios = itens.filter((i) => i.obrigatorio && i.liberado);
  const feitos = obrigatorios.filter((i) => concluidos.has(i.id)).length;
  return {
    total: obrigatorios.length,
    concluidos: feitos,
    completo: obrigatorios.length > 0 && feitos === obrigatorios.length,
  };
}
