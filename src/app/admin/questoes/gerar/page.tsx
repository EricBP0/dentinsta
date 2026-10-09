import Link from "next/link";
import { exigirEquipe } from "@/lib/auth";
import { FormularioGeracao } from "./formulario";
import { CabecalhoPagina } from "@/components/sistema";

export default async function GerarQuestoes({ searchParams }: PageProps<"/admin/questoes/gerar">) {
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
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · IA"
        titulo="Gerar questões com IA"
        descricao={
          <>
            Envie o material da aula e a IA cria questões objetivas e discursivas (com gabarito, explicação e rubrica)
            baseadas nele.{" "}
            <Link href="/admin/questoes/geracoes" className="font-semibold text-lima underline">
              Ver gerações anteriores
            </Link>
          </>
        }
      />
      <FormularioGeracao
        disciplinas={disciplinas ?? []}
        disciplinaPadrao={typeof disciplina === "string" ? disciplina : undefined}
      />
    </div>
  );
}
