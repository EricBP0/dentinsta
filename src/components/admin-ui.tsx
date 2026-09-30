import type { ReactNode } from "react";

// Estilos do backoffice, nos tokens da marca OdontoLab (docs/MARCA.md).
export const campo =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15";
export const botaoPrimario =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-teal-800";
export const botaoSecundario =
  "inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50";
export const botaoPerigo = "rounded-lg px-2 py-1 text-xs text-red-700 transition-colors hover:bg-red-50";

export function Rotulo({ texto, children, dica }: { texto: string; children: ReactNode; dica?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{texto}</span>
      {children}
      {dica && <span className="block text-xs text-slate-500">{dica}</span>}
    </label>
  );
}

const CORES: Record<string, string> = {
  rascunho: "bg-slate-100 text-slate-700 ring-slate-200",
  em_breve: "bg-sky-50 text-sky-800 ring-sky-200",
  publicada: "bg-teal-50 text-teal-800 ring-teal-200",
  publicado: "bg-teal-50 text-teal-800 ring-teal-200",
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

/** Título padrão das páginas do backoffice. */
export function TituloPagina({ titulo, descricao, children }: { titulo: string; descricao?: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-tinta">{titulo}</h1>
        {descricao && <p className="text-sm text-slate-600">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}
