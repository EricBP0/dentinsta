"use client";

import { useActionState, useState } from "react";
import { cadastrar, entrar, solicitarNovaSenha, type EstadoForm } from "./actions";

const campo =
  "w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-tinta focus:outline-none";

type Modo = "entrar" | "cadastrar" | "esqueci";

export function FormularioEntrar({ proximo, erroLink }: { proximo?: string; erroLink?: boolean }) {
  const [modo, setModo] = useState<Modo>("entrar");
  const [estadoEntrar, acaoEntrar, entrando] = useActionState<EstadoForm, FormData>(entrar, {});
  const [estadoCadastro, acaoCadastrar, cadastrando] = useActionState<EstadoForm, FormData>(cadastrar, {});
  const [estadoSenha, acaoSenha, enviando] = useActionState<EstadoForm, FormData>(solicitarNovaSenha, {});
  const estado = { entrar: estadoEntrar, cadastrar: estadoCadastro, esqueci: estadoSenha }[modo];
  const acao = { entrar: acaoEntrar, cadastrar: acaoCadastrar, esqueci: acaoSenha }[modo];

  return (
    <div className="w-full max-w-sm space-y-6 rounded-2xl border-2 border-tinta bg-white p-6 shadow-[6px_6px_0_0_var(--color-tinta)]">
      {erroLink && (
        <p className="rounded-2xl border-2 border-tinta bg-amber-50 p-3 text-sm text-amber-900">
          Esse link expirou ou já foi usado. Entre com sua senha ou peça um novo link.
        </p>
      )}

      {modo === "esqueci" ? (
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-slate-900">Esqueci minha senha</h1>
          <p className="text-sm text-slate-600">Enviamos um link para você criar uma nova senha.</p>
        </div>
      ) : (
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
      )}

      <form action={acao} className="space-y-4">
        <input type="hidden" name="proximo" value={proximo ?? ""} />
        {modo === "cadastrar" && <input name="nome" placeholder="Nome completo" required className={campo} />}
        <input name="email" type="email" placeholder="E-mail" required autoComplete="email" className={campo} />
        {modo !== "esqueci" && (
          <input
            name="senha"
            type="password"
            placeholder={modo === "cadastrar" ? "Senha (mínimo 8 caracteres)" : "Senha"}
            required
            autoComplete={modo === "cadastrar" ? "new-password" : "current-password"}
            className={campo}
          />
        )}

        {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
        {estado.mensagem && <p className="text-sm text-violeta-700">{estado.mensagem}</p>}

        <button
          disabled={entrando || cadastrando || enviando}
          className="w-full rounded-full bg-tinta py-2 font-bold text-white hover:bg-violeta disabled:opacity-60"
        >
          {{ entrar: "Entrar", cadastrar: "Criar conta", esqueci: "Enviar link" }[modo]}
        </button>
      </form>

      <p className="text-center text-sm">
        {modo === "entrar" && (
          <button type="button" onClick={() => setModo("esqueci")} className="text-slate-600 underline hover:text-slate-900">
            Esqueci minha senha
          </button>
        )}
        {modo === "esqueci" && (
          <button type="button" onClick={() => setModo("entrar")} className="text-slate-600 underline hover:text-slate-900">
            Voltar para entrar
          </button>
        )}
      </p>
    </div>
  );
}
