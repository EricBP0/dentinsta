import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { diaCurto, gradeDoMes, hojeBrasilia, limitesDoMes, mesValido, nomeDoMes, somarMeses } from "@/lib/clinica/clinica";
import { exigirClinica } from "../acesso";
import { excluirProva } from "../actions";
import { FormProva } from "../formularios";

type Prova = { id: string; materia: string; data: string; horario: string | null; observacoes: string; disciplina_id: string | null };

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function Provas({ searchParams }: PageProps<"/aluno/clinica/provas">) {
  const { supabase } = await exigirClinica();
  const { mes: mesPedido, nova } = await searchParams;
  const hoje = hojeBrasilia();
  const mes = mesValido(mesPedido) ? mesPedido : hoje.slice(0, 7);
  const { inicio, fim } = limitesDoMes(mes);

  const [{ data: provasDoMes }, { data: proximas }, { data: disciplinas }] = await Promise.all([
    supabase
      .from("clinica_provas")
      .select("id, materia, data, horario, observacoes, disciplina_id")
      .gte("data", inicio)
      .lte("data", fim)
      .order("data")
      .order("horario")
      .overrideTypes<Prova[], { merge: false }>(),
    supabase
      .from("clinica_provas")
      .select("id, materia, data, horario, observacoes, disciplina_id")
      .gte("data", hoje)
      .order("data")
      .limit(8)
      .overrideTypes<Prova[], { merge: false }>(),
    supabase.from("disciplinas").select("nome").in("status", ["publicada", "em_breve"]).order("nome"),
  ]);

  const porDia = new Map<string, Prova[]>();
  for (const p of provasDoMes ?? []) porDia.set(p.data, [...(porDia.get(p.data) ?? []), p]);
  const mostrarNova = nova === "1";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violeta-700">Planejamento</p>
          <h2 className="text-xl font-bold text-tinta">Calendário de provas</h2>
          <p className="text-sm text-slate-600">Veja suas provas do semestre num lugar só.</p>
        </div>
        <Link
          href={mostrarNova ? `?mes=${mes}` : `?mes=${mes}&nova=1`}
          className="inline-flex items-center gap-2 rounded-xl bg-violeta-700 px-4 py-2 text-sm font-medium text-white hover:bg-violeta-800"
        >
          <Plus className="size-4" /> {mostrarNova ? "Fechar" : "Nova prova"}
        </Link>
      </div>

      {mostrarNova && (
        <section className="rounded-2xl border border-violeta-200 bg-white p-5">
          <h3 className="mb-1 font-semibold text-tinta">Nova prova</h3>
          <p className="mb-4 text-sm text-slate-600">Escolha uma matéria da plataforma ou crie uma matéria pessoal.</p>
          <FormProva disciplinas={(disciplinas ?? []).map((d) => d.nome as string)} dia={hoje.startsWith(mes) ? hoje : `${mes}-01`} />
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <Link href={`?mes=${somarMeses(mes, -1)}`} aria-label="Mês anterior" className="grid size-9 place-items-center rounded-lg hover:bg-slate-100">
            <ChevronLeft className="size-4" />
          </Link>
          <h3 className="font-semibold capitalize text-tinta">{nomeDoMes(mes)}</h3>
          <Link href={`?mes=${somarMeses(mes, 1)}`} aria-label="Próximo mês" className="grid size-9 place-items-center rounded-lg hover:bg-slate-100">
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-slate-500">
          {SEMANA.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {gradeDoMes(mes).flat().map((d, i) =>
            d ? (
              <div
                key={d}
                className={`min-h-16 rounded-lg border p-1 sm:min-h-24 ${d === hoje ? "border-violeta-400 bg-violeta-50/50" : "border-slate-100"}`}
              >
                <p className={`text-xs font-semibold ${d === hoje ? "text-violeta-700" : "text-slate-500"}`}>{Number(d.slice(8))}</p>
                {(porDia.get(d) ?? []).map((p) => (
                  <p key={p.id} title={p.materia} className="mt-0.5 truncate rounded bg-violeta-700 px-1 py-0.5 text-[10px] font-medium text-white sm:text-[11px]">
                    {p.materia}
                  </p>
                ))}
              </div>
            ) : (
              <div key={`v${i}`} />
            ),
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-tinta">Próximas provas</h3>
        {(proximas ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">Nenhuma prova pela frente. Cadastre em “Nova prova”.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(proximas ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{p.materia}</p>
                  <p className="text-xs text-slate-500">
                    {p.data === hoje ? "Hoje" : diaCurto(p.data)}
                    {p.horario && ` · ${p.horario.slice(0, 5)}`}
                    {p.disciplina_id ? " · da plataforma" : " · pessoal"}
                    {p.observacoes && ` · ${p.observacoes}`}
                  </p>
                </div>
                <form action={excluirProva}>
                  <input type="hidden" name="id" value={p.id} />
                  <button aria-label="Excluir prova" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600">
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
