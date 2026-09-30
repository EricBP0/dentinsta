"use client";

import { useActionState } from "react";
import { botaoPrimario, botaoSecundario, campo } from "@/components/admin-ui";
import { criarCard, importarCards, type EstadoCards } from "./actions";

function Mensagens({ estado }: { estado: EstadoCards }) {
  return (
    <>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      {estado.mensagem && <p className="text-sm text-teal-700">{estado.mensagem}</p>}
      {estado.erros && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">Nada foi importado. Corrija estas linhas:</p>
          <ul className="mt-1 list-disc pl-5">
            {estado.erros.slice(0, 30).map((e) => (
              <li key={e.linha}>
                Linha {e.linha}: {e.mensagem}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export function NovoCard({ itemId }: { itemId: string }) {
  const [estado, acao, salvando] = useActionState<EstadoCards, FormData>(criarCard, {});
  return (
    <form action={acao} className="space-y-2">
      <input type="hidden" name="item_id" value={itemId} />
      <div className="grid gap-2 sm:grid-cols-2">
        <textarea name="frente" required rows={2} placeholder="Frente (pergunta ou termo)" className={campo} />
        <textarea name="verso" required rows={2} placeholder="Verso (resposta)" className={campo} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input name="imagem_url" type="url" placeholder="Imagem (URL, opcional)" className={`${campo} flex-1`} />
        <button disabled={salvando} className={`${botaoPrimario} disabled:opacity-60`}>
          Adicionar card
        </button>
      </div>
      <Mensagens estado={estado} />
    </form>
  );
}

export function ImportarCards({ itemId }: { itemId: string }) {
  const [estado, acao, enviando] = useActionState<EstadoCards, FormData>(importarCards, {});
  return (
    <form action={acao} className="space-y-2">
      <input type="hidden" name="item_id" value={itemId} />
      <p className="text-xs text-slate-500">
        Planilha CSV com as colunas <strong>frente</strong> e <strong>verso</strong> (e <strong>imagem_url</strong>,
        opcional). Cards com frente repetida são ignorados.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input name="arquivo" type="file" accept=".csv,text/csv" required className={`${campo} flex-1`} />
        <button disabled={enviando} className={`${botaoSecundario} px-4 py-2 text-sm disabled:opacity-60`}>
          {enviando ? "Importando…" : "Importar"}
        </button>
      </div>
      <Mensagens estado={estado} />
    </form>
  );
}
