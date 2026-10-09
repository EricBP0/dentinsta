import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  TIPOS_CONSULTA,
  diaPorExtenso,
  diasAte,
  hojeBrasilia,
  intervaloUtc,
  mesValido,
  nomeDoMes,
  partesBrasilia,
  somarMeses,
} from "@/lib/consultorio/consultorio";
import { COLUNAS_CONSULTA, resumoFinanceiro, type Consulta } from "@/lib/consultorio/dados";
import { formatarReais } from "@/lib/preco";
import { exigirConsultorio } from "./acesso";
import { EtiquetaTipo, Painel, Rotulo, Selo } from "./ui";

type Prova = { id: string; materia: string; data: string; horario: string | null };

export default async function VisaoGeral({ searchParams }: PageProps<"/aluno/consultorio">) {
  const { supabase } = await exigirConsultorio();
  const { mes: mesPedido } = await searchParams;
  const hoje = hojeBrasilia();
  const mes = mesValido(mesPedido) ? mesPedido : hoje.slice(0, 7);
  const deHoje = intervaloUtc(hoje, hoje);

  const [caixa, { data: agendaHoje }, { data: provas }, { count: pacientes }] = await Promise.all([
    resumoFinanceiro(supabase, mes),
    supabase
      .from("clinica_consultas")
      .select(COLUNAS_CONSULTA)
      .gte("inicio", deHoje.de)
      .lt("inicio", deHoje.ate)
      .neq("status", "cancelada")
      .order("inicio")
      .overrideTypes<Consulta[], { merge: false }>(),
    supabase
      .from("clinica_provas")
      .select("id, materia, data, horario")
      .gte("data", hoje)
      .order("data")
      .limit(4)
      .overrideTypes<Prova[], { merge: false }>(),
    supabase.from("clinica_pacientes").select("id", { count: "exact", head: true }),
  ]);

  const entradas = caixa.faturamento;
  const maior = Math.max(entradas, caixa.custos, 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Selo sigla="Sd" numero="01" valor={formatarReais(caixa.lucro)} rotulo="Saldo do mês" destaque />
        <Selo sigla="At" numero="02" valor={caixa.consultasDoMes} rotulo="Atendimentos" />
        <Selo sigla="Fl" numero="03" valor={caixa.faltasDoMes} rotulo="Faltas" />
        <Selo sigla="Pc" numero="04" valor={pacientes ?? 0} rotulo="Pacientes" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Painel
          rotulo="Hoje"
          titulo={<span className="capitalize">{diaPorExtenso(hoje)}</span>}
          acao={
            <Link href="/aluno/consultorio/agenda" className="inline-flex items-center gap-1 text-sm font-semibold text-violeta hover:underline">
              Agenda <ArrowRight className="size-4" />
            </Link>
          }
        >
          {(agendaHoje ?? []).length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
              <p className="text-slate-600">Dia livre. Nenhum atendimento marcado.</p>
              <Link href="/aluno/consultorio/agenda?novo=1" className="mt-2 inline-block text-sm font-semibold text-violeta hover:underline">
                Marcar atendimento
              </Link>
            </div>
          ) : (
            <ol className="relative space-y-3 border-l-2 border-tinta pl-5">
              {(agendaHoje ?? []).map((c) => (
                <li key={c.id} className="relative">
                  <span
                    className={`absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-tinta ${
                      c.status === "finalizada" ? "bg-lima" : c.status === "faltou" ? "bg-red-400" : "bg-white"
                    }`}
                  />
                  <p className="rotulo text-xs font-bold text-tinta">{partesBrasilia(c.inicio).hora}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{c.clinica_pacientes?.nome ?? TIPOS_CONSULTA[c.tipo].nome}</span>
                    <EtiquetaTipo tipo={c.tipo} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Painel>

        <Painel
          rotulo="Contagem regressiva"
          titulo="Próximas provas"
          acao={
            <Link href="/aluno/consultorio/provas" className="inline-flex items-center gap-1 text-sm font-semibold text-violeta hover:underline">
              Provas <ArrowRight className="size-4" />
            </Link>
          }
        >
          {(provas ?? []).length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Nenhuma prova pela frente.</p>
          ) : (
            <ul className="space-y-2">
              {(provas ?? []).map((p) => {
                const faltam = diasAte(hoje, p.data);
                return (
                  <li key={p.id} className="flex items-center gap-3">
                    <span
                      className={`grid size-12 shrink-0 place-items-center rounded-xl border-2 border-tinta text-center leading-none ${
                        faltam <= 3 ? "bg-lima" : "bg-white"
                      }`}
                    >
                      <span>
                        <span className="block text-lg font-extrabold">{faltam}</span>
                        <span className="rotulo text-[8px]">{faltam === 1 ? "dia" : "dias"}</span>
                      </span>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{p.materia}</p>
                      <p className="text-xs text-slate-500">
                        {faltam === 0 ? "Hoje" : faltam === 1 ? "Amanhã" : diaPorExtenso(p.data)}
                        {p.horario && ` · ${p.horario.slice(0, 5)}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>
      </div>

      <Painel
        rotulo="Caixa"
        titulo={<span className="capitalize">{nomeDoMes(mes)}</span>}
        acao={
          <div className="flex items-center gap-1">
            <Link href={`?mes=${somarMeses(mes, -1)}`} aria-label="Mês anterior" className="grid size-8 place-items-center rounded-full border-2 border-tinta hover:bg-lima">
              <ChevronLeft className="size-4" />
            </Link>
            <Link href={`?mes=${somarMeses(mes, 1)}`} aria-label="Próximo mês" className="grid size-8 place-items-center rounded-full border-2 border-tinta hover:bg-lima">
              <ChevronRight className="size-4" />
            </Link>
          </div>
        }
      >
        <div className="space-y-3">
          {[
            { nome: "Entradas", valor: entradas, cor: "bg-lima" },
            { nome: "Saídas", valor: caixa.custos, cor: "bg-red-300" },
          ].map((linha) => (
            <div key={linha.nome} className="grid grid-cols-[72px_1fr] items-center gap-3 sm:grid-cols-[90px_1fr_auto]">
              <Rotulo className="text-slate-600">{linha.nome}</Rotulo>
              <div className="h-6 overflow-hidden rounded-full border-2 border-tinta bg-white">
                <div className={`h-full ${linha.cor}`} style={{ width: `${(linha.valor / maior) * 100}%` }} />
              </div>
              <p className="col-span-2 break-all text-right text-sm font-bold text-tinta sm:col-span-1">{formatarReais(linha.valor)}</p>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-slate-200 pt-3">
            <p className="text-sm text-slate-600">
              Saldo: <strong className={caixa.lucro >= 0 ? "text-tinta" : "text-red-700"}>{formatarReais(caixa.lucro)}</strong>
              {entradas > 0 && ` · ${caixa.percentualCustos}% das entradas foram para saídas`}
            </p>
            <Link href={`/aluno/consultorio/caixa?mes=${mes}`} className="inline-flex items-center gap-1 text-sm font-semibold text-violeta hover:underline">
              Abrir caixa <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </Painel>
    </div>
  );
}
