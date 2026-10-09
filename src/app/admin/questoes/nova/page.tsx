import Link from "next/link";
import { exigirEquipe } from "@/lib/auth";
import { FormularioQuestao } from "../formulario";
import { CabecalhoPagina } from "@/components/sistema";

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
      <CabecalhoPagina tom="tinta" rotulo="Backoffice · Questões" titulo="Nova questão" />
      <FormularioQuestao
        disciplinas={disciplinas ?? []}
        disciplinaPadrao={typeof disciplina === "string" ? disciplina : undefined}
      />
    </div>
  );
}
