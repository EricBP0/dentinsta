import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirEquipe } from "@/lib/auth";
import { FormularioQuestao, type QuestaoExistente } from "../formulario";
import { CabecalhoPagina } from "@/components/sistema";

export default async function EditarQuestao({ params }: PageProps<"/admin/questoes/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirEquipe();

  // Gabarito e rubrica só saem por esta função (restrita à equipe).
  const [{ data: questao }, { data: disciplinas }] = await Promise.all([
    supabase.rpc("questao_completa", { p_questao_id: id }),
    supabase
      .from("disciplinas")
      .select("id, nome")
      .order("ordem")
      .overrideTypes<{ id: string; nome: string }[], { merge: false }>(),
  ]);
  if (!questao) notFound();
  const existente = questao as QuestaoExistente;

  return (
    <div className="space-y-6">
      <Link href={`/admin/questoes?disciplina=${existente.disciplina_id}`} className="text-sm text-slate-600 hover:text-slate-900">
        ← Banco de questões
      </Link>
      <CabecalhoPagina tom="tinta" rotulo="Backoffice · Questões" titulo="Editar questão" />
      <FormularioQuestao disciplinas={disciplinas ?? []} questao={existente} />
    </div>
  );
}
