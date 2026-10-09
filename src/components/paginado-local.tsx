"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Children, useState, type ReactNode } from "react";

/**
 * Pagina na hora, sem ir ao servidor, uma lista já carregada (ex.: blocos do
 * painel). Cada filho é um item.
 */
export function PaginadoLocal({
  children,
  porPagina,
  className,
  rotulo,
}: {
  children: ReactNode;
  porPagina: number;
  className?: string;
  /** Nome da lista para leitores de tela. */
  rotulo: string;
}) {
  const itens = Children.toArray(children);
  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina));
  const [pagina, setPagina] = useState(1);
  const atual = Math.min(pagina, totalPaginas);
  const botao =
    "inline-flex size-8 items-center justify-center rounded-full text-tinta transition hover:bg-lima disabled:pointer-events-none disabled:text-slate-300";

  return (
    <>
      <ul className={className}>{itens.slice((atual - 1) * porPagina, atual * porPagina)}</ul>
      {totalPaginas > 1 && (
        <nav aria-label={`Paginação: ${rotulo}`} className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span aria-live="polite">
            Página {atual} de {totalPaginas}
          </span>
          <span className="flex gap-1">
            <button type="button" className={botao} disabled={atual === 1} onClick={() => setPagina(atual - 1)} aria-label="Página anterior">
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              className={botao}
              disabled={atual === totalPaginas}
              onClick={() => setPagina(atual + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight className="size-4" />
            </button>
          </span>
        </nav>
      )}
    </>
  );
}
