"use client";

import { useActionState } from "react";
import { TIPOS_PIX } from "@/lib/afiliados";
import { salvarChavePix, solicitarSaque, type EstadoParceiro } from "./actions";

function Aviso({ estado }: { estado: EstadoParceiro }) {
  if (estado.erro) return <p className="text-sm text-red-700">{estado.erro}</p>;
  if (estado.mensagem) return <p className="text-sm text-violeta-800">{estado.mensagem}</p>;
  return null;
}

export function FormularioPix({ tipo, chave }: { tipo: string | null; chave: string | null }) {
  const [estado, salvar, salvando] = useActionState(salvarChavePix, {});
  return (
    <form action={salvar} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select
          name="tipo"
          defaultValue={tipo ?? "CPF"}
          aria-label="Tipo de chave Pix"
          className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm focus:border-tinta focus:outline-none"
        >
          {Object.entries(TIPOS_PIX).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
        <input
          name="chave"
          required
          defaultValue={chave ?? ""}
          placeholder="Sua chave Pix"
          aria-label="Chave Pix"
          className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-3 py-2 text-sm focus:border-tinta focus:outline-none"
        />
        <button disabled={salvando} className="rounded-full bg-tinta px-4 py-2 text-sm font-bold text-white hover:bg-violeta disabled:opacity-60">
          Salvar
        </button>
      </div>
      <Aviso estado={estado} />
    </form>
  );
}

export function BotaoSaque({ texto, desabilitado }: { texto: string; desabilitado: boolean }) {
  const [estado, pedir, pedindo] = useActionState(solicitarSaque, {});
  return (
    <form action={pedir} className="space-y-2">
      <button
        disabled={desabilitado || pedindo}
        className="w-full rounded-full border-2 border-tinta bg-lima py-3 font-bold text-tinta transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
      >
        {pedindo ? "Enviando…" : texto}
      </button>
      <Aviso estado={estado} />
    </form>
  );
}
