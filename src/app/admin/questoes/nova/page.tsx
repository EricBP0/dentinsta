import Link from "next/link";
import { exigirEquipe } from "@/lib/auth";
import { FormularioQuestao } from "../formulario";

export default async function NovaQuestao({ searchParams }: PageProps<"/admin/questoes/nova">) {
  const { disciplina } = await searchParams;
  const { supabase } = await exigirEquipe();
  const { data: disciplinas } = await supabase
    .from("disciplinas")
    .select("id, nome")
    .order("ordem")
    .overrideTypes<{ id: string; nome: string }[], { merge: false }>();

  return (
    <div className="space-y-6">
      <Link href="/admin/questoes" className="text-sm text-slate-600 hover:text-slate-900">
        ← Banco de questões
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">Nova questão</h1>
      <FormularioQuestao
        disciplinas={disciplinas ?? []}
        disciplinaPadrao={typeof disciplina === "string" ? disciplina : undefined}
      />
    </div>
  );
}
