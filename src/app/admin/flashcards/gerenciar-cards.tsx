import Link from "next/link";
import { botaoPerigo, botaoSecundario, campo, Selo } from "@/components/admin-ui";
import { exigirEquipe } from "@/lib/auth";
import { excluirCard, publicarRascunhos, salvarCard } from "./actions";
import { ImportarCards, NovoCard } from "./formularios";

type Card = {
  id: string;
  frente: string;
  verso: string;
  imagem_url: string | null;
  status: "rascunho" | "publicado";
  origem: string;
  fonte: string;
};

/** Seção do backoffice para montar o deck de um item do tipo "flashcards". */
export async function GerenciarCards({ itemId }: { itemId: string }) {
  const { supabase } = await exigirEquipe();
  const { data } = await supabase
    .from("flashcards")
    .select("id, frente, verso, imagem_url, status, origem, fonte")
    .eq("item_id", itemId)
    .order("ordem")
    .overrideTypes<Card[], { merge: false }>();
  const cards = data ?? [];
  const rascunhos = cards.filter((c) => c.status === "rascunho").length;

  return (
    <section className="space-y-6 rounded-2xl border-2 border-tinta bg-white p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-tinta">Cards do deck</h2>
          <p className="text-sm text-slate-600">
            {cards.length} cards · {cards.length - rascunhos} publicados
            {rascunhos > 0 && ` · ${rascunhos} rascunhos (os alunos não veem)`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/itens/${itemId}/gerar`} className={`${botaoSecundario} px-4 py-2 text-sm`}>
            ✨ Gerar com IA
          </Link>
          {rascunhos > 0 && (
            <form action={publicarRascunhos}>
              <input type="hidden" name="item_id" value={itemId} />
              <button className={`${botaoSecundario} px-4 py-2 text-sm`}>Publicar rascunhos ({rascunhos})</button>
            </form>
          )}
        </div>
      </header>

      <div className="space-y-4">
        <NovoCard itemId={itemId} />
        <ImportarCards itemId={itemId} />
      </div>

      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {cards.map((card) => (
          <li key={card.id} className="py-3">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{card.frente}</p>
                  <p className="line-clamp-2 text-sm text-slate-600">{card.verso}</p>
                  {card.fonte && <p className="text-xs text-slate-400">Fonte: {card.fonte}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {card.origem === "ia" && <span className="text-xs text-sky-700">IA</span>}
                  <Selo status={card.status} texto={card.status === "publicado" ? "Publicado" : "Rascunho"} />
                </div>
              </summary>
              <div className="mt-3 flex flex-wrap items-start gap-2">
                <form action={salvarCard} className="flex-1 space-y-2">
                  <input type="hidden" name="id" value={card.id} />
                  <input type="hidden" name="item_id" value={itemId} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <textarea name="frente" defaultValue={card.frente} rows={3} className={campo} />
                    <textarea name="verso" defaultValue={card.verso} rows={3} className={campo} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input name="imagem_url" type="url" defaultValue={card.imagem_url ?? ""} placeholder="Imagem (URL)" className={`${campo} flex-1`} />
                    <select name="status" defaultValue={card.status} className={`${campo} w-auto`}>
                      <option value="publicado">Publicado</option>
                      <option value="rascunho">Rascunho</option>
                    </select>
                    <button className={`${botaoSecundario} px-3`}>Salvar</button>
                  </div>
                </form>
                <form action={excluirCard}>
                  <input type="hidden" name="id" value={card.id} />
                  <input type="hidden" name="item_id" value={itemId} />
                  <button className={botaoPerigo}>Excluir</button>
                </form>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
