import { Plus, X } from "lucide-react";
import Link from "next/link";
import { diaPorExtenso, diasAte, hojeBrasilia, somarDias } from "@/lib/consultorio/consultorio";
import { exigirConsultorio } from "../acesso";
import { excluirProva } from "../actions";
import { FormProva } from "../formularios";
import { botaoEscuro, Painel, Rotulo } from "../ui";

type Prova = { id: string; materia: string; data: string; horario: string | null; observacoes: string; disciplina_id: string | null };

export default async function Provas({ searchParams }: PageProps<"/aluno/consultorio/provas">) {
  const { supabase } = await exigirConsultorio();
  const { nova } = await searchParams;
  const hoje = hojeBrasilia();

  const [{ data: futuras }, { data: passadas }, { data: disciplinas }] = await Promise.all([
    supabase
      .from("clinica_provas")
      .select("id, materia, data, horario, observacoes, disciplina_id")
      .gte("data", hoje)
      .order("data")
      .order("horario")
      .limit(100)
      .overrideTypes<Prova[], { merge: false }>(),
    supabase
      .from("clinica_provas")
      .select("id, materia, data, horario, observacoes, disciplina_id")
      .lt("data", hoje)
      .order("data", { ascending: false })
      .limit(6)
      .overrideTypes<Prova[], { merge: false }>(),
    supabase.from("disciplinas").select("nome").in("status", ["publicada", "em_breve"]).order("nome"),
  ]);

  const proximaSemana = somarDias(hoje, 7);
  const grupos = [
    { titulo: "Nos próximos 7 dias", provas: (futuras ?? []).filter((p) => p.data <= proximaSemana) },
    { titulo: "Mais adiante", provas: (futuras ?? []).filter((p) => p.data > proximaSemana) },
  ];
  const formAberto = nova === "1";

  return (
    <div className={`grid gap-6 ${formAberto ? "xl:grid-cols-[1fr_380px]" : ""}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Rotulo className="text-violeta">Contagem regressiva</Rotulo>
            <h2 className="text-2xl font-extrabold tracking-tight text-tinta">Suas provas</h2>
          </div>
          {!formAberto && (
            <Link href="?nova=1" className={botaoEscuro}>
              <Plus className="size-4" /> Nova prova
            </Link>
          )}
        </div>

        {(futuras ?? []).length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-slate-600">Nenhuma prova pela frente.</p>
            {!formAberto && (
              <Link href="?nova=1" className="mt-3 inline-block text-sm font-semibold text-violeta hover:underline">
                Cadastrar prova
              </Link>
            )}
          </div>
        )}

        {grupos
          .filter((g) => g.provas.length)
          .map((g) => (
            <section key={g.titulo} className="space-y-3">
              <Rotulo className="text-slate-500">{g.titulo}</Rotulo>
              <ul className="grid gap-3 sm:grid-cols-2">
                {g.provas.map((p) => {
                  const faltam = diasAte(hoje, p.data);
                  const urgente = faltam <= 3;
                  return (
                    <li key={p.id} className={`flex gap-3 rounded-2xl border-2 border-tinta p-4 ${urgente ? "bg-lima" : "bg-white"}`}>
                      <div className="grid size-16 shrink-0 place-items-center rounded-xl border-2 border-tinta bg-white text-center leading-none">
                        <span>
                          <span className="block text-2xl font-extrabold">{faltam}</span>
                          <span className="rotulo text-[9px]">{faltam === 0 ? "hoje" : faltam === 1 ? "dia" : "dias"}</span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-bold leading-tight text-tinta">{p.materia}</p>
                        <p className="text-xs capitalize text-slate-700">
                          {diaPorExtenso(p.data)}
                          {p.horario && ` · ${p.horario.slice(0, 5)}`}
                        </p>
                        <Rotulo className="text-slate-500">{p.disciplina_id ? "Disciplina da plataforma" : "Matéria pessoal"}</Rotulo>
                        {p.observacoes && <p className="text-xs text-slate-600">{p.observacoes}</p>}
                      </div>
                      <form action={excluirProva}>
                        <input type="hidden" name="id" value={p.id} />
                        <button aria-label="Excluir prova" className="rounded-full p-1 text-slate-500 hover:bg-white hover:text-red-600">
                          <X className="size-4" />
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

        {(passadas ?? []).length > 0 && (
          <section className="space-y-2">
            <Rotulo className="text-slate-500">Já passaram</Rotulo>
            <ul className="flex flex-wrap gap-2">
              {(passadas ?? []).map((p) => (
                <li key={p.id} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-500 line-through">
                  {p.materia} · {p.data.slice(8)}/{p.data.slice(5, 7)}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {formAberto && (
        <Painel
          rotulo="Nova"
          titulo="Cadastrar prova"
          className="bg-papel xl:sticky xl:top-20 xl:self-start"
          acao={
            <Link href="?" aria-label="Fechar" className="rounded-full p-1 text-slate-500 hover:bg-white">
              <X className="size-4" />
            </Link>
          }
        >
          <FormProva disciplinas={(disciplinas ?? []).map((d) => d.nome as string)} dia={hoje} />
        </Painel>
      )}
    </div>
  );
}
