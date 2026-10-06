/**
 * Conteúdo estruturado de um resumo, gerado por scripts/resumos/converter.py a
 * partir dos PDFs. Fica em itens.config.resumo (um item por módulo do PDF).
 */

/** Trecho de texto: b = negrito, i = itálico, d = destaque (termo-chave). */
export type Trecho = { x: string; b?: 1; i?: 1; d?: 1 };

export type BlocoResumo =
  | { t: "p"; r: Trecho[] }
  | { t: "sub"; x: string }
  | { t: "caixa"; titulo: string; blocos: BlocoResumo[] }
  | { t: "tabela"; linhas: Trecho[][][]; cabecalho: boolean }
  /** src = caminho no bucket "resumos" (ex.: "cirurgia/img/0001.webp"). */
  | { t: "img"; src: string; w: number; h: number; legenda?: string };

export type SecaoResumo = {
  numero: string;
  rotulo: string;
  titulo: string;
  blocos: BlocoResumo[];
};

export type ConteudoResumo = { secoes: SecaoResumo[] };

/** Caminhos de todas as figuras do resumo (para assinar de uma vez). */
export function figurasDoResumo(resumo: ConteudoResumo): string[] {
  const caminhos: string[] = [];
  const visitar = (blocos: BlocoResumo[]) => {
    for (const b of blocos) {
      if (b.t === "img") caminhos.push(b.src);
      else if (b.t === "caixa") visitar(b.blocos);
    }
  };
  for (const s of resumo.secoes) visitar(s.blocos);
  return caminhos;
}

/** Âncora estável de uma seção (para o sumário). */
export function ancoraSecao(indice: number) {
  return `secao-${indice + 1}`;
}
