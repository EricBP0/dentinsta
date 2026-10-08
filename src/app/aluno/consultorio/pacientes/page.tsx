import { Mail, Phone, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { exigirConsultorio } from "../acesso";
import { excluirPaciente } from "../actions";
import { campoConsultorio, FormPaciente, type PacienteForm } from "../formularios";
import { botaoEscuro, Painel, Rotulo } from "../ui";

function idade(nascimento: string | null): string | null {
  if (!nascimento) return null;
  const n = new Date(`${nascimento}T00:00:00Z`);
  const hoje = new Date();
  let anos = hoje.getUTCFullYear() - n.getUTCFullYear();
  if (hoje.getUTCMonth() < n.getUTCMonth() || (hoje.getUTCMonth() === n.getUTCMonth() && hoje.getUTCDate() < n.getUTCDate())) anos--;
  return anos >= 0 && anos < 130 ? `${anos} anos` : null;
}

export default async function Pacientes({ searchParams }: PageProps<"/aluno/consultorio/pacientes">) {
  const { supabase } = await exigirConsultorio();
  const { q, novo, editar } = await searchParams;
  const busca = typeof q === "string" ? q.trim().slice(0, 100) : "";

  let consulta = supabase
    .from("clinica_pacientes")
    .select("id, nome, telefone, email, nascimento, observacoes")
    .order("nome")
    .limit(200);
  if (busca) consulta = consulta.ilike("nome", `%${busca.replace(/[%_\\]/g, "\\$&")}%`);
  const { data } = await consulta.overrideTypes<PacienteForm[], { merge: false }>();
  const pacientes = data ?? [];
  const emEdicao = typeof editar === "string" ? pacientes.find((p) => p.id === editar) : undefined;
  const formAberto = novo === "1" || Boolean(emEdicao);
  const sufixoBusca = busca ? `q=${encodeURIComponent(busca)}` : "";

  return (
    <div className={`grid gap-6 ${formAberto ? "xl:grid-cols-[1fr_380px]" : ""}`}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <form className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={busca} placeholder="Procurar paciente pelo nome" className={`${campoConsultorio} pl-9`} />
          </form>
          {!formAberto && (
            <Link href={`?novo=1${sufixoBusca ? `&${sufixoBusca}` : ""}`} className={botaoEscuro}>
              <Plus className="size-4" /> Novo
            </Link>
          )}
        </div>

        <Rotulo className="text-slate-500">
          {pacientes.length} {pacientes.length === 1 ? "paciente" : "pacientes"}
          {busca && ` para “${busca}”`}
        </Rotulo>

        {pacientes.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-slate-600">{busca ? "Ninguém com esse nome." : "Sua lista de pacientes está vazia."}</p>
            {!busca && !formAberto && (
              <Link href="?novo=1" className="mt-3 inline-block text-sm font-semibold text-violeta hover:underline">
                Cadastrar o primeiro
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {pacientes.map((p) => {
              const anos = idade(p.nascimento);
              const ativo = p.id === emEdicao?.id;
              return (
                <li key={p.id}>
                  <Link
                    href={`?editar=${p.id}${sufixoBusca ? `&${sufixoBusca}` : ""}`}
                    className={`flex h-full gap-3 rounded-2xl border-2 bg-white p-4 transition hover:-translate-y-0.5 ${ativo ? "border-violeta" : "border-tinta"}`}
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-tinta bg-lima text-lg font-extrabold text-tinta">
                      {p.nome.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-bold text-slate-900">{p.nome}</p>
                      {anos && <Rotulo className="text-slate-500">{anos}</Rotulo>}
                      {p.telefone && (
                        <p className="flex items-center gap-1.5 truncate text-xs text-slate-600">
                          <Phone className="size-3" /> {p.telefone}
                        </p>
                      )}
                      {p.email && (
                        <p className="flex items-center gap-1.5 truncate text-xs text-slate-600">
                          <Mail className="size-3" /> {p.email}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {formAberto && (
        <Painel
          rotulo={emEdicao ? "Ficha" : "Novo"}
          titulo={emEdicao ? emEdicao.nome : "Cadastrar paciente"}
          className="bg-papel xl:sticky xl:top-20 xl:self-start"
          acao={
            <Link href={`?${sufixoBusca}`} aria-label="Fechar" className="rounded-full p-1 text-slate-500 hover:bg-white">
              <X className="size-4" />
            </Link>
          }
        >
          <FormPaciente key={emEdicao?.id ?? "novo"} paciente={emEdicao} />
          {emEdicao && (
            <form action={excluirPaciente} className="mt-4 border-t-2 border-dashed border-slate-200 pt-3">
              <input type="hidden" name="id" value={emEdicao.id} />
              <button className="text-xs font-semibold text-red-600 hover:underline">Excluir paciente (os atendimentos ficam sem paciente)</button>
            </form>
          )}
        </Painel>
      )}
    </div>
  );
}
