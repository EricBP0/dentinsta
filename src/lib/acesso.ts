// Regras de acesso do aluno (docs/PLANEJAMENTO.md, seção 4.1.1).
// A mesma regra é aplicada no banco em pode_acessar_item() — manter as duas iguais.

export const MESES_DE_NOVIDADES = 12;

export type Acesso = {
  novidadesAte: Date;
  iaAte: Date;
};

export type DatasPublicacao = {
  item: Date | null;
  modulo: Date | null;
  disciplina: Date | null;
};

/** "liberado": pode abrir. "renove": publicado depois da janela. "sem_acesso": não comprou. */
export type SituacaoItem = "liberado" | "renove" | "sem_acesso";

/** O item só "existe" para o aluno quando item, módulo e disciplina já foram publicados. */
export function dataEfetivaPublicacao(datas: DatasPublicacao): Date | null {
  const conhecidas = [datas.item, datas.modulo, datas.disciplina].filter(
    (d): d is Date => d !== null,
  );
  if (conhecidas.length === 0) return null;
  return new Date(Math.max(...conhecidas.map((d) => d.getTime())));
}

export function situacaoItem(params: {
  acesso: Acesso | null;
  datas: DatasPublicacao;
  equipe?: boolean;
}): SituacaoItem {
  if (params.equipe) return "liberado";
  if (!params.acesso) return "sem_acesso";
  const publicacao = dataEfetivaPublicacao(params.datas);
  if (!publicacao) return "renove";
  return publicacao.getTime() <= params.acesso.novidadesAte.getTime() ? "liberado" : "renove";
}

export function iaAtiva(acesso: Acesso | null, agora: Date = new Date()): boolean {
  return acesso !== null && agora.getTime() <= acesso.iaAte.getTime();
}

/** Correção por IA: aluno com a IA na janela, ou equipe (que testa sem ter comprado). */
export function podeCorrigirComIa(acesso: Acesso | null, equipe: boolean, agora: Date = new Date()): boolean {
  return equipe || iaAtiva(acesso, agora);
}

/** Nova compra ou renovação: janela de 12 meses a partir da data informada. */
export function calcularJanela(inicio: Date): Acesso {
  const fim = new Date(inicio);
  fim.setUTCMonth(fim.getUTCMonth() + MESES_DE_NOVIDADES);
  return { novidadesAte: fim, iaAte: fim };
}

export function paraData(valor: string | null): Date | null {
  return valor ? new Date(valor) : null;
}
