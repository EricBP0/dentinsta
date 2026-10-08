import { CalendarCheck, ChevronLeft, ChevronRight, CircleCheck, CircleX, FileText, GraduationCap, Users } from "lucide-react";
import Link from "next/link";
import { TIPOS_CONSULTA, diaCurto, hojeBrasilia, intervaloUtc, mesValido, nomeDoMes, partesBrasilia, somarDias, somarMeses } from "@/lib/clinica/clinica";
import { COLUNAS_CONSULTA, resumoFinanceiro, type Consulta } from "@/lib/clinica/dados";
import { formatarReais } from "@/lib/preco";
import { exigirClinica } from "./acesso";

type Prova = { id: string; materia: string; data: string; horario: string | null };

export default async function DashboardClinica({ searchParams }: PageProps<"/aluno/clinica">) {
  const { supabase } = await exigirClinica();
  const { mes: mesPedido } = await searchParams;
  const hoje = hojeBrasilia();
  const mes = mesValido(mesPedido) ? mesPedido : hoje.slice(0, 7);
  const proximos = intervaloUtc(hoje, somarDias(hoje, 30));

  const [resumo, { data: consultas }, { data: provas }, { count: pacientes }] = await Promise.all([
    resumoFinanceiro(supabase, mes),
    supabase
      .from("clinica_consultas")
      .select(COLUNAS_CONSULTA)
      .eq("status", "agendada")
      .gte("inicio", new Date().toISOString())
      .lt("inicio", proximos.ate)
      .order("inicio")
      .limit(5)
      .overrideTypes<Consulta[], { merge: false }>(),
    supabase
      .from("clinica_provas")
      .select("id, materia, data, horario")
      .gte("data", hoje)
      .order("data")
      .limit(5)
      .overrideTypes<Prova[], { merge: false }>(),
    supabase.from("clinica_pacientes").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-3 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Faturamento do mês</p>
            <p className="mt-1 break-all text-3xl font-bold text-emerald-600 sm:text-4xl">{formatarReais(resumo.faturamento)}</p>
            <p className="mt-1 text-sm capitalize text-slate-500">{nomeDoMes(mes)}</p>
          </div>
          <div className="flex gap-1">
            <Link href={`/aluno/clinica?mes=${somarMeses(mes, -1)}`} aria-label="Mês anterior" className="grid size-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50">
              <ChevronLeft className="size-4" />
            </Link>
            <Link href={`/aluno/clinica?mes=${somarMeses(mes, 1)}`} aria-label="Próximo mês" className="grid size-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50">
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="space-y-3 border-t border-slate-100 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Custos</p>
              <p className="break-all text-lg font-semibold text-red-600">{formatarReais(resumo.custos)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Lucro</p>
              <p className={`break-all text-lg font-semibold ${resumo.lucro >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatarReais(resumo.lucro)}
              </p>
            </div>
          </div>
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-gradient-to-r from-violeta-500 to-blue-500">
              <div className="h-full bg-red-400" style={{ width: `${resumo.percentualCustos}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{resumo.percentualCustos}% da receita vai para custos</p>
          </div>
          <Link
            href={`/aluno/clinica/financeiro?mes=${mes}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <FileText className="size-4" /> Ver detalhes financeiros
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Numero icone={<CircleCheck className="size-5 text-emerald-600" />} fundo="bg-emerald-50" valor={resumo.consultasDoMes} rotulo="Consultas do mês" />
        <Numero icone={<CircleX className="size-5 text-red-600" />} fundo="bg-red-50" valor={resumo.faltasDoMes} rotulo="Faltas do mês" />
        <Numero icone={<Users className="size-5 text-violeta-700" />} fundo="bg-violeta-50" valor={pacientes ?? 0} rotulo="Pacientes" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-tinta"><CalendarCheck className="size-4" /> Próximas consultas</h2>
            <Link href="/aluno/clinica/calendario" className="text-sm text-violeta-700 hover:underline">Agenda →</Link>
          </div>
          {(consultas ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">Nenhuma consulta agendada.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(consultas ?? []).map((c) => {
                const { dia, hora } = partesBrasilia(c.inicio);
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      {TIPOS_CONSULTA[c.tipo].emoji} {c.clinica_pacientes?.nome ?? TIPOS_CONSULTA[c.tipo].nome}
                    </span>
                    <Link href={`/aluno/clinica/calendario?dia=${dia}`} className="shrink-0 text-slate-500 hover:text-violeta-700">
                      {diaCurto(dia)} · {hora}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-tinta"><GraduationCap className="size-4" /> Próximas provas</h2>
            <Link href="/aluno/clinica/provas" className="text-sm text-violeta-700 hover:underline">Provas →</Link>
          </div>
          {(provas ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">Nenhuma prova cadastrada.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(provas ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{p.materia}</span>
                  <span className="shrink-0 text-slate-500">
                    {p.data === hoje ? "Hoje" : diaCurto(p.data)}
                    {p.horario && ` · ${p.horario.slice(0, 5)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Numero({ icone, fundo, valor, rotulo }: { icone: React.ReactNode; fundo: string; valor: number; rotulo: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className={`grid size-10 place-items-center rounded-full ${fundo}`}>{icone}</div>
      <p className="mt-3 text-3xl font-bold text-tinta">{valor}</p>
      <p className="text-sm text-slate-600">{rotulo}</p>
    </div>
  );
}
