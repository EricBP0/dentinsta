"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { AVULSOS, MODULOS, PRECO_MENSAL, somaAvulsos, type Modulo } from "@/lib/planos";

const reais = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Card do Essencial: Disciplinas + os módulos que o aluno marcar, com o total na hora. */
export function CartaoEssencial({ inicial }: { inicial: Modulo[] }) {
  const [marcados, setMarcados] = useState<Modulo[]>(inicial);
  const total = somaAvulsos(["disciplinas", ...marcados]);
  const passaDoCompleto = total >= PRECO_MENSAL.completo;

  return (
    <form action="/assinar/escolher" className="flex flex-col gap-4 rounded-3xl border-2 border-tinta bg-white p-6">
      <input type="hidden" name="plano" value="essencial" />
      <div>
        <p className="rotulo text-[11px] font-semibold text-violeta-700">Essencial</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight text-tinta">
          {reais(total)}
          <span className="text-base font-semibold text-slate-500">/mês</span>
        </p>
        <p className="text-sm text-slate-600">Monte do seu jeito: comece pelas Disciplinas e some o que quiser.</p>
      </div>

      <ul className="space-y-2 text-sm">
        <li className="flex items-start gap-2 rounded-xl bg-violeta-50 p-3">
          <Check className="mt-0.5 size-4 shrink-0 text-violeta-700" />
          <span className="flex-1">
            <strong className="text-tinta">{MODULOS.disciplinas.nome}</strong>
            <span className="block text-xs text-slate-600">{MODULOS.disciplinas.descricao}</span>
          </span>
          <span className="text-xs font-semibold text-slate-700">{reais(MODULOS.disciplinas.precoCentavos)}</span>
        </li>
        {AVULSOS.map((m) => (
          <li key={m}>
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-xl border-2 p-3 transition ${
                marcados.includes(m) ? "border-tinta bg-lima/30" : "border-slate-200 hover:border-tinta"
              }`}
            >
              <input
                type="checkbox"
                name="modulos"
                value={m}
                checked={marcados.includes(m)}
                onChange={(e) => setMarcados((atual) => (e.target.checked ? [...atual, m] : atual.filter((x) => x !== m)))}
                className="mt-0.5 size-4 accent-tinta"
              />
              <span className="flex-1">
                <strong className="text-tinta">+ {MODULOS[m].nome}</strong>
                <span className="block text-xs text-slate-600">{MODULOS[m].descricao}</span>
              </span>
              <span className="text-xs font-semibold text-slate-700">{reais(MODULOS[m].precoCentavos)}</span>
            </label>
          </li>
        ))}
      </ul>

      {passaDoCompleto && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          Com esses módulos sai mais caro que o <strong>Completo ({reais(PRECO_MENSAL.completo)})</strong>, que tem tudo.
        </p>
      )}
      <button className="mt-auto rounded-full border-2 border-tinta py-3 font-bold text-tinta transition hover:bg-lima">
        Continuar com o Essencial
      </button>
    </form>
  );
}
