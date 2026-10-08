import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
} from "@/lib/clinica/clinica";
import { COLUNAS_CONSULTA, type Consulta } from "@/lib/clinica/dados";
import { formatarReais } from "@/lib/preco";
import { excluirConsulta, mudarStatusConsulta } from "../actions";
import { exigirClinica } from "../acesso";
import { FormConsulta } from "../formularios";

const COR_STATUS: Record<Consulta["status"], string> = {
  agendada: "bg-violeta-50 text-violeta-800",
  finalizada: "bg-emerald-50 text-emerald-800",
  faltou: "bg-red-50 text-red-800",
  cancelada: "bg-slate-100 text-slate-500 line-through",
};

export default async function Calendario({ searchParams }: PageProps<"/aluno/clinica/calendario">) {
  const { supabase } = await exigirClinica();
  const { dia: diaPedido, agendar } = await searchParams;
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
  const mostrarAgendar = agendar === "1";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold capitalize text-tinta">Consultas do dia · {diaPorExtenso(dia)}</h2>
          <Link
            href={mostrarAgendar ? `?dia=${dia}` : `?dia=${dia}&agendar=1`}
            className="inline-flex items-center gap-2 rounded-xl bg-violeta-700 px-4 py-2 text-sm font-medium text-white hover:bg-violeta-800"
          >
            <Plus className="size-4" /> {mostrarAgendar ? "Fechar" : "Agendar"}
          </Link>
        </div>

        {mostrarAgendar && (
          <div className="mt-4 rounded-xl border border-violeta-200 bg-violeta-50/40 p-4">
            <h3 className="mb-4 font-semibold text-violeta-900">Nova consulta</h3>
            <FormConsulta dia={dia} pacientes={pacientes ?? []} />
          </div>
        )}

        {doDia.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Nenhuma consulta agendada para este dia.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {doDia.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-xl" aria-hidden>{TIPOS_CONSULTA[c.tipo].emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {partesBrasilia(c.inicio).hora} · {c.clinica_pacientes?.nome ?? TIPOS_CONSULTA[c.tipo].nome}
                    </p>
                    <p className="text-xs text-slate-500">
                      {TIPOS_CONSULTA[c.tipo].nome} · {c.duracao_min} min
                      {Number(c.valor_centavos) > 0 && ` · ${formatarReais(Number(c.valor_centavos))}`}
                      {c.observacoes && ` · ${c.observacoes}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_STATUS[c.status]}`}>{STATUS_CONSULTA[c.status]}</span>
                  {c.status === "agendada" ? (
                    <>
                      <Status id={c.id} status="finalizada" texto="Finalizar" classe="text-emerald-700 hover:bg-emerald-50" />
                      <Status id={c.id} status="faltou" texto="Faltou" classe="text-red-700 hover:bg-red-50" />
                      <Status id={c.id} status="cancelada" texto="Cancelar" classe="text-slate-600 hover:bg-slate-100" />
                    </>
                  ) : (
                    <Status id={c.id} status="agendada" texto="Reabrir" classe="text-slate-600 hover:bg-slate-100" />
                  )}
                  <form action={excluirConsulta}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-red-600">Excluir</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-tinta">Agenda semanal</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">{diaCurto(semana[0])} – {diaCurto(semana[6])}</span>
            <Link href={`?dia=${somarDias(dia, -7)}`} aria-label="Semana anterior" className="grid size-8 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50">
              <ChevronLeft className="size-4" />
            </Link>
            <Link href={`?dia=${somarDias(dia, 7)}`} aria-label="Próxima semana" className="grid size-8 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50">
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="-mx-5 overflow-x-auto px-5">
          <div className="grid min-w-[700px] grid-cols-7 gap-2">
            {semana.map((d) => {
              const selecionado = d === dia;
              return (
                <Link
                  key={d}
                  href={`?dia=${d}`}
                  className={`flex min-h-48 flex-col overflow-hidden rounded-xl border transition ${
                    selecionado ? "border-violeta-500 ring-2 ring-violeta-100" : "border-slate-200 hover:border-violeta-300"
                  }`}
                >
                  <div className={`py-2 text-center ${selecionado ? "bg-violeta-700 text-white" : d === hoje ? "bg-violeta-50" : "bg-slate-50"}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{diaDaSemana(d)}</p>
                    <p className="text-xl font-bold">{d.slice(8)}</p>
                  </div>
                  <div className="flex-1 space-y-1 p-1.5">
                    {(porDia.get(d) ?? []).map((c) => (
                      <p key={c.id} className={`truncate rounded-md px-1.5 py-1 text-[11px] font-medium ${COR_STATUS[c.status]}`}>
                        {partesBrasilia(c.inicio).hora} {c.clinica_pacientes?.nome ?? TIPOS_CONSULTA[c.tipo].nome}
                      </p>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function Status({ id, status, texto, classe }: { id: string; status: string; texto: string; classe: string }) {
  return (
    <form action={mudarStatusConsulta}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`rounded-lg px-2 py-1 text-xs font-medium ${classe}`}>{texto}</button>
    </form>
  );
}
