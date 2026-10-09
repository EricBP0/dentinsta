// Busca, filtros e paginação das listas (puros, testáveis).

/** Valor de um parâmetro da URL como texto ("" quando ausente ou repetido). */
export function textoParam(valor: string | string[] | undefined): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/** Número da página pedido na URL (1 quando inválido). */
export function lerPagina(valor: string | string[] | undefined): number {
  const n = Number(textoParam(valor));
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Texto em minúsculas e sem acentos, para comparar buscas. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Todas as palavras da busca aparecem em algum dos textos (sem diferenciar acentos). */
export function correspondeBusca(busca: string, ...textos: (string | null | undefined)[]): boolean {
  const palavras = normalizar(busca).split(/\s+/).filter(Boolean);
  if (!palavras.length) return true;
  const alvo = normalizar(textos.filter(Boolean).join(" "));
  return palavras.every((p) => alvo.includes(p));
}

export type Pagina<T> = { itens: T[]; pagina: number; totalPaginas: number; total: number };

/** Recorta a lista na página pedida. Página além do fim vira a última. */
export function paginar<T>(lista: T[], pagina: number, porPagina: number): Pagina<T> {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (atual - 1) * porPagina;
  return { itens: lista.slice(inicio, inicio + porPagina), pagina: atual, totalPaginas, total: lista.length };
}

/** Intervalo [de, ate] (inclusivo) para o `.range()` do Supabase. */
export function faixa(pagina: number, porPagina: number): [number, number] {
  const de = (Math.max(1, pagina) - 1) * porPagina;
  return [de, de + porPagina - 1];
}

/** Total de páginas a partir da contagem do banco. */
export function totalDePaginas(total: number | null | undefined, porPagina: number): number {
  return Math.max(1, Math.ceil((total ?? 0) / porPagina));
}

/**
 * Termo seguro para usar dentro de `ilike` num filtro `.or()` do PostgREST:
 * vírgulas, parênteses, aspas e curingas quebrariam a expressão.
 */
export function termoIlike(busca: string): string {
  return busca.replace(/[%_*,()"'\\:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

/**
 * Números de página para mostrar: a primeira, a última e as vizinhas da
 * atual; `null` marca um salto ("…").
 */
export function paginasVisiveis(atual: number, total: number, vizinhas = 1): (number | null)[] {
  const paginas: (number | null)[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - atual) <= vizinhas) paginas.push(p);
    else if (paginas[paginas.length - 1] !== null) paginas.push(null);
  }
  return paginas;
}

/** Monta "?a=1&b=2" a partir dos parâmetros, sem os vazios. */
export function montarQuery(params: Record<string, string | number | null | undefined>): string {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== null && valor !== undefined && valor !== "") busca.set(chave, String(valor));
  }
  const texto = busca.toString();
  return texto ? `?${texto}` : "";
}
