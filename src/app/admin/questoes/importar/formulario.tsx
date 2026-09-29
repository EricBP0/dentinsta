"use client";

import Link from "next/link";
import { useActionState } from "react";
import { botaoPrimario, campo, Rotulo } from "@/components/admin-ui";
import { importarQuestoes, type EstadoImportacao } from "../actions";

export function FormularioImportacao({
  disciplinas,
  disciplinaPadrao,
}: {
  disciplinas: { id: string; nome: string }[];
  disciplinaPadrao?: string;
}) {
  const [estado, acao, enviando] = useActionState<EstadoImportacao, FormData>(importarQuestoes, {});

  return (
    <form action={acao} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Rotulo texto="Disciplina">
          <select name="disciplina_id" defaultValue={disciplinaPadrao ?? ""} required className={campo}>
            <option value="">Escolha…</option>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>{d.nome}</option>
            ))}
          </select>
        </Rotulo>
        <Rotulo texto="Importar como" dica="Rascunho: revise antes de liberar para os alunos.">
          <select name="status" defaultValue="rascunho" className={campo}>
            <option value="rascunho">Rascunho</option>
            <option value="aprovada">Aprovadas</option>
          </select>
        </Rotulo>
      </div>
      <Rotulo texto="Arquivo CSV">
        <input name="arquivo" type="file" accept=".csv,text/csv" required className={campo} />
      </Rotulo>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      {estado.erros && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">Nada foi importado. Corrija estas linhas e envie de novo:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {estado.erros.slice(0, 50).map((e) => (
              <li key={e.linha}>
                Linha {e.linha}: {e.mensagem}
              </li>
            ))}
          </ul>
          {estado.erros.length > 50 && <p className="mt-2">…e mais {estado.erros.length - 50} linhas.</p>}
        </div>
      )}
      {estado.importadas !== undefined && (
        <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800">
          {estado.importadas} questões importadas. <Link href="/admin/questoes" className="underline">Ver banco de questões</Link>
        </p>
      )}

      <button disabled={enviando} className={`${botaoPrimario} disabled:opacity-60`}>
        {enviando ? "Importando…" : "Importar"}
      </button>
    </form>
  );
}
