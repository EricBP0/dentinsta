"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Texto com botão de copiar (link e cupom do afiliado). */
export function Copiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-tinta bg-white p-2 pl-3">
      <span className="min-w-0 flex-1 truncate font-mono text-sm text-tinta" title={texto}>
        {texto}
      </span>
      <button
        type="button"
        aria-label={`Copiar ${rotulo}`}
        onClick={async () => {
          await navigator.clipboard.writeText(texto).catch(() => {});
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-tinta px-3 py-1.5 text-xs font-bold text-white hover:bg-violeta"
      >
        {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
