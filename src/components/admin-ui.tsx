import type { ReactNode } from "react";
import { CabecalhoPagina } from "@/components/sistema";

// Estilos do backoffice, nos tokens da marca OdontoLab (docs/MARCA.md).
export const campo =
  "w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-tinta focus:outline-none";
export const botaoPrimario =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-tinta px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-violeta disabled:opacity-60";
export const botaoSecundario =
  "inline-flex items-center justify-center gap-1 rounded-full border-2 border-tinta bg-white px-3 py-1 text-xs font-semibold text-tinta transition-colors hover:bg-lima";
export const botaoPerigo = "rounded-full px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50";

export function Rotulo({ texto, children, dica }: { texto: string; children: ReactNode; dica?: string }) {
  return (
    <label className="block space-y-1">
      <span className="rotulo text-[10px] font-semibold text-slate-600">{texto}</span>
      {children}
      {dica && <span className="block text-xs text-slate-500">{dica}</span>}
    </label>
  );
}

const CORES: Record<string, string> = {
  rascunho: "bg-slate-100 text-slate-700 ring-slate-200",
  em_breve: "bg-sky-50 text-sky-800 ring-sky-200",
  publicada: "bg-violeta-50 text-violeta-800 ring-violeta-200",
  publicado: "bg-violeta-50 text-violeta-800 ring-violeta-200",
  arquivada: "bg-slate-100 text-slate-500 ring-slate-200",
};

export function Selo({ status, texto }: { status: string; texto?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CORES[status] ?? CORES.rascunho}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />
      {texto ?? status.replace("_", " ")}
    </span>
  );
}

/** Título padrão das páginas do backoffice: a faixa preta quadriculada. */
export function TituloPagina({ titulo, descricao, children }: { titulo: string; descricao?: string; children?: ReactNode }) {
  return (
    <CabecalhoPagina tom="tinta" rotulo="Backoffice" titulo={titulo} descricao={descricao}>
      {children}
    </CabecalhoPagina>
  );
}
