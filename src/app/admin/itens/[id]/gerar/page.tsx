import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioGeracao } from "@/app/admin/questoes/gerar/formulario";
import { exigirEquipe } from "@/lib/auth";

export default async function GerarFlashcards({ params }: PageProps<"/admin/itens/[id]/gerar">) {
  const { id } = await params;
  const { supabase } = await exigirEquipe();
  const { data: item } = await supabase
    .from("itens")
    .select("id, titulo, tipo")
    .eq("id", id)
    .maybeSingle<{ id: string; titulo: string; tipo: string }>();
  if (!item || item.tipo !== "flashcards") notFound();

  return (
    <div className="space-y-6">
      <Link href={`/admin/itens/${item.id}`} className="text-sm text-slate-600 hover:text-slate-900">
        ← {item.titulo}
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Gerar flashcards com IA</h1>
        <p className="text-sm text-slate-600">
          Envie o material e a IA cria cards de pergunta e resposta baseados nele. Os cards entram como rascunho neste
          deck. <Link href="/admin/questoes/geracoes" className="underline">Acompanhar gerações</Link>
        </p>
      </header>
      <FormularioGeracao disciplinas={[]} deck={{ id: item.id, titulo: item.titulo }} />
    </div>
  );
}
