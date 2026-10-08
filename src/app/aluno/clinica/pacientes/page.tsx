import { Plus, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { exigirClinica } from "../acesso";
import { excluirPaciente } from "../actions";
import { campoClinica, FormPaciente, type PacienteForm } from "../formularios";

export default async function Pacientes({ searchParams }: PageProps<"/aluno/clinica/pacientes">) {
  const { supabase } = await exigirClinica();
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
  const mostrarNovo = novo === "1";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <form className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={busca} placeholder="Buscar pacientes…" className={`${campoClinica} pl-9`} />
        </form>
        <Link
          href={mostrarNovo ? "?" : "?novo=1"}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violeta-700 px-4 text-sm font-medium text-white hover:bg-violeta-800"
        >
          <Plus className="size-4" /> {mostrarNovo ? "Fechar" : "Novo"}
        </Link>
      </div>

      {mostrarNovo && (
        <section className="rounded-2xl border border-violeta-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-tinta">Novo paciente</h2>
          <FormPaciente />
        </section>
      )}

      {pacientes.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center">
          <UserRound className="size-10 text-slate-400" />
          <p className="text-slate-600">{busca ? "Nenhum paciente encontrado." : "Você ainda não tem pacientes cadastrados."}</p>
          {!busca && !mostrarNovo && (
            <Link href="?novo=1" className="inline-flex items-center gap-2 rounded-xl bg-violeta-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-violeta-800">
              <Plus className="size-4" /> Adicionar primeiro paciente
            </Link>
          )}
        </section>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {pacientes.map((p) =>
            p.id === emEdicao?.id ? (
              <li key={p.id} className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-tinta">Editar paciente</h2>
                  <Link href="?" className="text-sm text-slate-500 hover:text-slate-800">Cancelar</Link>
                </div>
                <FormPaciente paciente={p} />
                <form action={excluirPaciente} className="border-t border-slate-100 pt-3">
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-sm text-red-600 hover:underline">Excluir paciente (as consultas ficam sem paciente)</button>
                </form>
              </li>
            ) : (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violeta-50 text-sm font-semibold text-violeta-800">
                    {p.nome.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{p.nome}</p>
                    <p className="truncate text-xs text-slate-500">{[p.telefone, p.email].filter(Boolean).join(" · ") || "Sem contato"}</p>
                  </div>
                </div>
                <Link href={`?editar=${p.id}${busca ? `&q=${encodeURIComponent(busca)}` : ""}`} className="shrink-0 text-sm text-violeta-700 hover:underline">
                  Editar
                </Link>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
