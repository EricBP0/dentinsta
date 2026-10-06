"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/app/entrar/actions";
import { definirNovaSenha } from "./actions";

const campo =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-violeta-600 focus:outline-none";

export function FormularioNovaSenha() {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(definirNovaSenha, {});
  return (
    <form action={acao} className="w-full max-w-sm space-y-4 rounded-2xl border-2 border-tinta bg-white p-6 shadow-[6px_6px_0_0_var(--color-tinta)]">
      <h1 className="text-lg font-semibold text-slate-900">Criar nova senha</h1>
      <input name="senha" type="password" placeholder="Nova senha (mínimo 8 caracteres)" required minLength={8} autoComplete="new-password" className={campo} />
      <input name="confirmacao" type="password" placeholder="Repita a nova senha" required autoComplete="new-password" className={campo} />
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button disabled={salvando} className="w-full rounded-lg bg-violeta-700 py-2 font-medium text-white hover:bg-violeta-800 disabled:opacity-60">
        Salvar nova senha
      </button>
    </form>
  );
}
