"use client";

import { useActionState, useState } from "react";
import { aplicarCupom } from "@/app/assinar/actions";

export function FormularioCupom({ voltar }: { voltar: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, aplicar, aplicando] = useActionState(aplicarCupom, {});
  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="text-sm font-semibold text-violeta-700 underline">
        Tem um cupom de desconto?
      </button>
    );
  }
  return (
    <form action={aplicar} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="voltar" value={voltar} />
      <input
        name="cupom"
        required
        autoFocus
        placeholder="CUPOM"
        aria-label="Cupom de desconto"
        className="w-40 rounded-full border-2 border-slate-200 px-3 py-1.5 text-sm uppercase focus:border-tinta focus:outline-none"
      />
      <button disabled={aplicando} className="rounded-full bg-tinta px-4 py-1.5 text-sm font-bold text-white hover:bg-violeta disabled:opacity-60">
        Aplicar
      </button>
      {estado.erro && <p className="w-full text-sm text-red-700">{estado.erro}</p>}
    </form>
  );
}
