"use client";

import { useActionState, useState } from "react";
import { cadastrar, entrar, type EstadoForm } from "./actions";

const campo =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none";

export function FormularioEntrar({ proximo }: { proximo?: string }) {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [estadoEntrar, acaoEntrar, entrando] = useActionState<EstadoForm, FormData>(entrar, {});
  const [estadoCadastro, acaoCadastrar, cadastrando] = useActionState<EstadoForm, FormData>(
    cadastrar,
    {},
  );
  const estado = modo === "entrar" ? estadoEntrar : estadoCadastro;

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
        {(["entrar", "cadastrar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`flex-1 rounded-md py-2 ${modo === m ? "bg-white font-medium shadow-sm" : "text-slate-600"}`}
          >
            {m === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      <form action={modo === "entrar" ? acaoEntrar : acaoCadastrar} className="space-y-4">
        <input type="hidden" name="proximo" value={proximo ?? ""} />
        {modo === "cadastrar" && (
          <input name="nome" placeholder="Nome completo" required className={campo} />
        )}
        <input name="email" type="email" placeholder="E-mail" required className={campo} />
        <input name="senha" type="password" placeholder="Senha" required className={campo} />

        {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
        {estado.mensagem && <p className="text-sm text-teal-700">{estado.mensagem}</p>}

        <button
          disabled={entrando || cadastrando}
          className="w-full rounded-lg bg-teal-700 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {modo === "entrar" ? "Entrar" : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
