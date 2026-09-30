import Link from "next/link";
import { botaoPrimario, campo, Selo } from "@/components/admin-ui";
import { exigirEquipe } from "@/lib/auth";
import { NOME_STATUS_DISCIPLINA, type Disciplina } from "@/lib/tipos";
import { criarDisciplina } from "./actions";

export default async function AdminDisciplinas() {
  const { supabase } = await exigirEquipe();
  const { data: disciplinas } = await supabase
    .from("disciplinas")
    .select("*, modulos(count)")
    .order("ordem")
    .overrideTypes<(Disciplina & { modulos: { count: number }[] })[], { merge: false }>();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-tinta">Disciplinas</h1>
        <p className="text-sm text-slate-600">
          Crie a disciplina, organize módulos e itens e publique quando estiver pronta.
        </p>
      </header>

      <form action={criarDisciplina} className="flex flex-col gap-3 sm:flex-row">
        <input name="nome" placeholder="Nome da nova disciplina (ex.: Endodontia)" required className={campo} />
        <button className={`${botaoPrimario} shrink-0`}>Criar disciplina</button>
      </form>

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {(disciplinas ?? []).length === 0 && (
          <li className="p-4 text-sm text-slate-600">Nenhuma disciplina cadastrada.</li>
        )}
        {(disciplinas ?? []).map((d) => (
          <li key={d.id}>
            <Link
              href={`/admin/disciplinas/${d.id}`}
              className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">{d.nome}</p>
                <p className="text-xs text-slate-500">
                  {d.modulos[0]?.count ?? 0} módulos
                  {d.periodo_sugerido && ` · ${d.periodo_sugerido}º período`}
                </p>
              </div>
              <Selo status={d.status} texto={NOME_STATUS_DISCIPLINA[d.status]} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
