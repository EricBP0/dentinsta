"use client";

import { useActionState, useState } from "react";
import { criarSimulado, type EstadoSimulado } from "./actions";

const campo =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violeta-600 focus:outline-none";

export function NovoSimulado({
  disciplinas,
  iaAtiva,
}: {
  disciplinas: { id: string; nome: string; temas: string[] }[];
  iaAtiva: boolean;
}) {
  const [estado, acao, criando] = useActionState<EstadoSimulado, FormData>(criarSimulado, {});
  const [disciplinaId, setDisciplinaId] = useState(disciplinas[0]?.id ?? "");
  const temas = disciplinas.find((d) => d.id === disciplinaId)?.temas ?? [];

  if (disciplinas.length === 0) {
    return <p className="text-sm text-slate-600">Nenhuma disciplina liberada para simulados ainda.</p>;
  }

  return (
    <form action={acao} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">Disciplina</span>
          <select name="disciplina_id" value={disciplinaId} onChange={(e) => setDisciplinaId(e.target.value)} className={campo}>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>{d.nome}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Tema</span>
          <select key={disciplinaId} name="tema" className={campo}>
            <option value="">Todos</option>
            {temas.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Questões</span>
          <select name="quantidade" defaultValue="10" className={campo}>
            {[5, 10, 20, 30].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Dificuldade</span>
          <select name="dificuldade" className={campo}>
            <option value="">Todas</option>
            <option value="1">Fácil</option>
            <option value="2">Média</option>
            <option value="3">Difícil</option>
          </select>
        </label>
      </div>

      <fieldset className="flex flex-wrap gap-4 text-sm text-slate-700">
        <label className="flex items-center gap-2">
          <input type="radio" name="tipo" value="" defaultChecked={iaAtiva} disabled={!iaAtiva} /> Objetivas e discursivas
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="tipo" value="objetiva" defaultChecked={!iaAtiva} /> Só objetivas
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="tipo" value="discursiva" disabled={!iaAtiva} /> Só discursivas (correção por IA)
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={criando} className="rounded-lg bg-violeta-700 px-4 py-2 text-sm font-medium text-white hover:bg-violeta-800 disabled:opacity-60">
          {criando ? "Montando…" : "Começar simulado"}
        </button>
        {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      </div>
      <p className="text-xs text-slate-500">
        Priorizamos questões que você ainda não respondeu e as que você errou.
      </p>
    </form>
  );
}
