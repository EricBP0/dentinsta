import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import Link from "next/link";
import {
  STATUS_CONSULTA,
  TIPOS_CONSULTA,
  diaCurto,
  diaDaSemana,
  diaPorExtenso,
  diaValido,
  hojeBrasilia,
  intervaloUtc,
  partesBrasilia,
  semanaDe,
  somarDias,
} from "@/lib/consultorio/consultorio";
import { COLUNAS_CONSULTA, type Consulta } from "@/lib/consultorio/dados";
import { formatarReais } from "@/lib/preco";
import { exigirConsultorio } from "../acesso";
import { excluirConsulta, mudarStatusConsulta } from "../actions";
import { FormConsulta } from "../formularios";
import { botaoEscuro, botaoSuave, EtiquetaTipo, Painel, Rotulo } from "../ui";

const MARCA_STATUS: Record<Consulta["status"], string> = {
  agendada: "bg-white",
  finalizada: "bg-lima",
  faltou: "bg-red-300",
  cancelada: "bg-slate-200",
};

export default async function Agenda({ searchParams }: PageProps<"/aluno/consultorio/agenda">) {
  const { supabase } = await exigirConsultorio();
  const { dia: diaPedido, novo } = await searchParams;
  const hoje = hojeBrasilia();
  const dia = diaValido(diaPedido) ? diaPedido : hoje;
  const semana = semanaDe(dia);
  const { de, ate } = intervaloUtc(semana[0], semana[6]);

  const [{ data: consultas }, { data: pacientes }] = await Promise.all([
    supabase
      .from("clinica_consultas")
      .select(COLUNAS_CONSULTA)
      .gte("inicio", de)
      .lt("inicio", ate)
      .order("inicio")
      .overrideTypes<Consulta[], { merge: false }>(),
    supabase.from("clinica_pacientes").select("id, nome").order("nome").overrideTypes<{ id: string; nome: string }[], { merge: false }>(),
  ]);

  const porDia = new Map<string, Consulta[]>(semana.map((d) => [d, []]));
  for (const c of consultas ?? []) porDia.get(partesBrasilia(c.inicio).dia)?.push(c);
  const doDia = porDia.get(dia) ?? [];
  const formAberto = novo === "1";

  return (
    <div className="space-y-6">
      {/* Semana */}
      <div className="flex items-center gap-2">
        <Link href={`?dia=${somarDias(dia, -7)}`} aria-label="Semana anterior" className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-tinta bg-white hover:bg-lima">
          <ChevronLeft className="size-4" />
        </Link>
        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {semana.map((d) => {
            const atual = d === dia;
            const quantos = (porDia.get(d) ?? []).filter((c) => c.status !== "cancelada").length;
            return (
              <Link
                key={d}
                href={`?dia=${d}${formAberto ? "&novo=1" : ""}`}
                aria-current={atual ? "date" : undefined}
                className={`flex flex-col items-center rounded-xl border-2 py-2 transition ${
                  atual ? "border-tinta bg-tinta text-white" : d === hoje ? "border-tinta bg-lima text-tinta" : "border-slate-200 bg-white text-slate-700 hover:border-tinta"
                }`}
              >
                <span className="rotulo text-[9px] font-bold sm:text-[10px]">{diaDaSemana(d).slice(0, 3)}</span>
                <span className="text-lg font-extrabold leading-tight sm:text-xl">{d.slice(8)}</span>
                <span className={`mt-0.5 h-1.5 rounded-full ${quantos ? (atual ? "bg-lima" : "bg-violeta") : ""}`} style={{ width: `${Math.min(quantos, 5) * 6}px` }} />
              </Link>
            );
          })}
        </div>
        <Link href={`?dia=${somarDias(dia, 7)}`} aria-label="Próxima semana" className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-tinta bg-white hover:bg-lima">
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className={`grid gap-6 ${formAberto ? "xl:grid-cols-[1fr_380px]" : ""}`}>
        <Painel
          rotulo={dia === hoje ? "Hoje" : diaCurto(dia)}
          titulo={<span className="capitalize">{diaPorExtenso(dia)}</span>}
          acao={
            !formAberto && (
              <Link href={`?dia=${dia}&novo=1`} className={botaoEscuro}>
                <Plus className="size-4" /> Marcar
              </Link>
            )
          }
        >
          {doDia.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-500">Nada marcado para este dia.</div>
          ) : (
            <ol className="space-y-3">
              {doDia.map((c) => {
                const { hora } = partesBrasilia(c.inicio);
                return (
                  <li key={c.id} className="grid grid-cols-[56px_1fr] gap-3">
                    <div className="pt-2 text-right">
                      <p className="rotulo text-sm font-bold text-tinta">{hora}</p>
                      <p className="text-[11px] text-slate-500">{c.duracao_min} min</p>
                    </div>
                    <div className={`rounded-xl border-2 border-tinta p-3 ${c.status === "cancelada" ? "opacity-60" : ""}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <p className={`font-bold text-slate-900 ${c.status === "cancelada" ? "line-through" : ""}`}>
                            {c.clinica_pacientes?.nome ?? TIPOS_CONSULTA[c.tipo].nome}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <EtiquetaTipo tipo={c.tipo} />
                            <span className={`rotulo inline-flex items-center gap-1 rounded-md border border-tinta px-1.5 py-0.5 text-[10px] font-bold ${MARCA_STATUS[c.status]}`}>
                              {STATUS_CONSULTA[c.status]}
                            </span>
                            {Number(c.valor_centavos) > 0 && <span className="text-xs font-semibold text-slate-600">{formatarReais(Number(c.valor_centavos))}</span>}
                          </div>
                          {c.observacoes && <p className="text-sm text-slate-600">{c.observacoes}</p>}
                        </div>
                        <form action={excluirConsulta}>
                          <input type="hidden" name="id" value={c.id} />
                          <button aria-label="Excluir atendimento" className="rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                            <X className="size-4" />
                          </button>
                        </form>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {c.status === "agendada" ? (
                          <>
                            <Acao id={c.id} status="finalizada" texto="Atendido" />
                            <Acao id={c.id} status="faltou" texto="Faltou" />
                            <Acao id={c.id} status="cancelada" texto="Desmarcar" />
                          </>
                        ) : (
                          <Acao id={c.id} status="agendada" texto="Voltar para marcado" />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Painel>

        {formAberto && (
          <Painel
            rotulo="Novo"
            titulo="Marcar atendimento"
            className="bg-papel xl:self-start"
            acao={
              <Link href={`?dia=${dia}`} aria-label="Fechar" className="rounded-full p-1 text-slate-500 hover:bg-white">
                <X className="size-4" />
              </Link>
            }
          >
            <FormConsulta dia={dia} pacientes={pacientes ?? []} />
          </Painel>
        )}
      </div>

      <Rotulo className="text-slate-500">
        Atendidos entram no caixa do mês · {diaCurto(semana[0])} a {diaCurto(semana[6])}
      </Rotulo>
    </div>
  );
}

function Acao({ id, status, texto }: { id: string; status: string; texto: string }) {
  return (
    <form action={mudarStatusConsulta}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={botaoSuave}>{texto}</button>
    </form>
  );
}
