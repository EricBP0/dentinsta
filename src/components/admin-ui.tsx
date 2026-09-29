import type { ReactNode } from "react";

export const campo =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none";
export const botaoPrimario =
  "rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800";
export const botaoSecundario =
  "rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50";
export const botaoPerigo = "rounded-md px-2 py-1 text-xs text-red-700 hover:bg-red-50";

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
  rascunho: "bg-slate-100 text-slate-700",
  em_breve: "bg-sky-100 text-sky-800",
  publicada: "bg-teal-100 text-teal-800",
  publicado: "bg-teal-100 text-teal-800",
  arquivada: "bg-slate-200 text-slate-500",
};

export function Selo({ status, texto }: { status: string; texto?: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CORES[status] ?? CORES.rascunho}`}>
      {texto ?? status.replace("_", " ")}
    </span>
  );
}
