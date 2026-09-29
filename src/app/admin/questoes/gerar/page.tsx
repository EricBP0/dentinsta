import Link from "next/link";
import { exigirEquipe } from "@/lib/auth";
import { FormularioGeracao } from "./formulario";

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
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Gerar questões com IA</h1>
        <p className="text-sm text-slate-600">
          Envie o material da aula e a IA cria questões objetivas e discursivas (com gabarito, explicação e rubrica)
          baseadas nele. <Link href="/admin/questoes/geracoes" className="underline">Ver gerações anteriores</Link>
        </p>
      </header>
      <FormularioGeracao
        disciplinas={disciplinas ?? []}
        disciplinaPadrao={typeof disciplina === "string" ? disciplina : undefined}
      />
    </div>
  );
}
