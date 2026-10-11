"use client";

import { useActionState } from "react";
import type { Contato, EstadoContato } from "@/lib/cadastro";

const campo =
  "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-tinta focus:outline-none";

/** Nome, e-mail e WhatsApp: usado no "Quero conhecer" e na hora de pagar sem conta. */
export function FormularioContato({
  acao,
  ocultos = {},
  inicial,
  botao,
  enviandoTexto,
}: {
  acao: (estado: EstadoContato, formData: FormData) => Promise<EstadoContato>;
  ocultos?: Record<string, string | string[]>;
  inicial?: Partial<Contato>;
  botao: string;
  enviandoTexto: string;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoContato, FormData>(acao, {});
  // Depois de um erro, o React limpa o formulário: os campos voltam com o que foi digitado.
  const valores = { ...inicial, ...estado.valores };
  return (
    <form action={enviar} className="space-y-3">
      {Object.entries(ocultos).flatMap(([nome, valor]) =>
        [valor].flat().map((v) => <input key={`${nome}-${v}`} type="hidden" name={nome} value={v} />),
      )}
      {/* Isca para robôs: invisível para pessoas. */}
      <input name="site" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="block space-y-1 text-sm font-semibold text-tinta">
        Nome
        <input name="nome" required autoComplete="name" defaultValue={valores.nome} placeholder="Seu nome completo" className={campo} />
      </label>
      <label className="block space-y-1 text-sm font-semibold text-tinta">
        E-mail
        <input name="email" type="email" required autoComplete="email" defaultValue={valores.email} placeholder="voce@email.com" className={campo} />
      </label>
      <label className="block space-y-1 text-sm font-semibold text-tinta">
        WhatsApp
        <input
          name="telefone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          defaultValue={valores.telefone}
          placeholder="(11) 98765-4321"
          className={campo}
        />
      </label>
      {estado.erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{estado.erro}</p>}
      <button
        disabled={enviando}
        className="w-full rounded-full bg-tinta py-3 font-bold text-white transition hover:bg-violeta disabled:opacity-60"
      >
        {enviando ? enviandoTexto : botao}
      </button>
    </form>
  );
}
