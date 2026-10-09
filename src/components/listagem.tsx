import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { montarQuery, paginasVisiveis } from "@/lib/listagem";
import { FiltroSelect } from "./listagem-filtro";

// Busca, filtros e paginação das listas, guardados na URL: dá para voltar,
// recarregar e mandar o link de uma busca para outra pessoa.

type Params = Record<string, string | number | null | undefined>;

/**
 * Barra de busca com filtros (passe <FiltroSelect> como children). Os filtros
 * aplicam assim que mudam; o texto, ao apertar Enter ou "Buscar". Toda busca
 * volta para a página 1. `manter` guarda parâmetros de outras partes da página.
 */
export function BarraBusca({
  acao,
  busca,
  nome = "q",
  placeholder = "Buscar",
  children,
  manter = {},
  limpar = false,
}: {
  acao: string;
  busca: string;
  /** Nome do parâmetro do texto (quando a página tem mais de uma busca). */
  nome?: string;
  placeholder?: string;
  children?: ReactNode;
  manter?: Params;
  /** Mostra "Limpar" (há busca ou filtro ativo). */
  limpar?: boolean;
}) {
  return (
    <Form action={acao} className="flex flex-wrap items-center gap-2" role="search">
      {Object.entries(manter).map(([chave, valor]) =>
        valor === null || valor === undefined || valor === "" ? null : (
          <input key={chave} type="hidden" name={chave} value={String(valor)} />
        ),
      )}
      <label className="relative min-w-52 flex-1">
        <span className="sr-only">{placeholder}</span>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          name={nome}
          defaultValue={busca}
          placeholder={placeholder}
          className="w-full rounded-full border-2 border-tinta bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:ring-2 focus:ring-lima focus:outline-none"
        />
      </label>
      {children}
      <button className="rounded-full border-2 border-tinta bg-tinta px-4 py-2 text-sm font-bold text-white transition hover:bg-violeta">
        Buscar
      </button>
      {limpar && (
        <Link
          href={`${acao}${montarQuery(manter)}`}
          className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-tinta"
        >
          <X className="size-4" /> Limpar
        </Link>
      )}
    </Form>
  );
}

export { FiltroSelect };

/** "Mostrando 21–40 de 135". */
export function ResumoLista({ pagina, porPagina, total, nome }: { pagina: number; porPagina: number; total: number; nome: [string, string] }) {
  if (total === 0) return null;
  const de = (pagina - 1) * porPagina + 1;
  const ate = Math.min(pagina * porPagina, total);
  return (
    <p className="text-xs text-slate-500">
      {total <= porPagina ? `${total} ${total === 1 ? nome[0] : nome[1]}` : `Mostrando ${de}–${ate} de ${total} ${nome[1]}`}
    </p>
  );
}

/** Links de página. `params` são os filtros atuais, mantidos em cada link. */
export function Paginacao({
  acao,
  pagina,
  totalPaginas,
  params = {},
  chave = "pagina",
  rolar = true,
}: {
  acao: string;
  pagina: number;
  totalPaginas: number;
  params?: Params;
  chave?: string;
  /** false mantém a rolagem (listas no meio da página). */
  rolar?: boolean;
}) {
  if (totalPaginas <= 1) return null;
  const href = (p: number) => `${acao}${montarQuery({ ...params, [chave]: p > 1 ? p : null })}`;
  const base = "inline-flex size-9 items-center justify-center rounded-full text-sm font-semibold transition";
  const seta = (p: number, rotulo: string, icone: ReactNode) =>
    p < 1 || p > totalPaginas ? (
      <span aria-hidden className={`${base} text-slate-300`}>{icone}</span>
    ) : (
      <Link href={href(p)} scroll={rolar} aria-label={rotulo} className={`${base} text-tinta hover:bg-lima`}>
        {icone}
      </Link>
    );

  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-center gap-1">
      {seta(pagina - 1, "Página anterior", <ChevronLeft className="size-4" />)}
      {paginasVisiveis(pagina, totalPaginas).map((p, i) =>
        p === null ? (
          <span key={`salto-${i}`} className="px-1 text-slate-400">…</span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            scroll={rolar}
            aria-current={p === pagina ? "page" : undefined}
            className={`${base} ${p === pagina ? "border-2 border-tinta bg-tinta text-white" : "text-slate-700 hover:bg-lima hover:text-tinta"}`}
          >
            {p}
          </Link>
        ),
      )}
      {seta(pagina + 1, "Próxima página", <ChevronRight className="size-4" />)}
    </nav>
  );
}
