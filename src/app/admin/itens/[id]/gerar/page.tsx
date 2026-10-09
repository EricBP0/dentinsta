import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioGeracao } from "@/app/admin/questoes/gerar/formulario";
import { exigirEquipe } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/sistema";

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
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · IA"
        titulo="Gerar flashcards com IA"
        descricao={
          <>
            Envie o material e a IA cria cards de pergunta e resposta baseados nele. Os cards entram como rascunho
            neste deck.{" "}
            <Link href="/admin/questoes/geracoes" className="font-semibold text-lima underline">
              Acompanhar gerações
            </Link>
          </>
        }
      />
      <FormularioGeracao disciplinas={[]} deck={{ id: item.id, titulo: item.titulo }} />
    </div>
  );
}
