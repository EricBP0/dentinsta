"use client";

import { Printer } from "lucide-react";

export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full bg-tinta px-4 py-2 text-sm font-bold text-white hover:bg-violeta print:hidden"
    >
      <Printer className="size-4" /> Imprimir
    </button>
  );
}
