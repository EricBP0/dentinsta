import Link from "next/link";
import { notFound } from "next/navigation";
import { botaoPrimario, campo, Rotulo } from "@/components/admin-ui";
import { exigirEquipe } from "@/lib/auth";
import { isoParaLocal } from "@/lib/datas";
import { COLUNAS_ITEM, NOME_TIPO_ITEM, type ConfigItem, type Item } from "@/lib/tipos";
import { salvarItem } from "../../actions";

export default async function AdminItem({ params }: PageProps<"/admin/itens/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirEquipe();

  const { data: item } = await supabase
    .from("itens")
    .select(`${COLUNAS_ITEM}, modulos(titulo, disciplina_id)`)
    .eq("id", id)
    .maybeSingle<Item & { modulos: { titulo: string; disciplina_id: string } }>();
  if (!item) notFound();

  // A coluna config só é lida pela função, que libera tudo para a equipe.
  const { data } = await supabase.rpc("conteudo_item", { p_item_id: id });
  const config = (data ?? {}) as ConfigItem;

  return (
    <div className="space-y-6">
      <Link href={`/admin/disciplinas/${item.modulos.disciplina_id}`} className="text-sm text-slate-600 hover:text-slate-900">
        ← {item.modulos.titulo}
      </Link>

      <form action={salvarItem} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <input type="hidden" name="id" value={item.id} />
        <p className="text-sm text-slate-500">{NOME_TIPO_ITEM[item.tipo]}</p>

        <Rotulo texto="Título">
          <input name="titulo" defaultValue={item.titulo} required className={campo} />
        </Rotulo>

        {item.tipo === "video" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Rotulo texto="URL de incorporação do vídeo" dica="Copie o link de embed no painel do Panda Video.">
                <input name="video_url" type="url" defaultValue={config.video_url ?? ""} className={campo} />
              </Rotulo>
            </div>
            <Rotulo texto="Duração (min)">
              <input name="duracao_min" type="number" min={0} defaultValue={config.duracao_min ?? ""} className={campo} />
            </Rotulo>
          </div>
        )}

        {item.tipo === "resumo" && (
          <>
            <Rotulo texto="Texto do resumo">
              <textarea name="conteudo" defaultValue={config.conteudo ?? ""} rows={14} className={campo} />
            </Rotulo>
            <Rotulo texto="PDF (URL, opcional)">
              <input name="pdf_url" type="url" defaultValue={config.pdf_url ?? ""} className={campo} />
            </Rotulo>
          </>
        )}

        {item.tipo === "mapa_mental" && (
          <Rotulo texto="Imagem do mapa mental (URL)" dica="Exporte em PNG/JPG em alta resolução.">
            <input name="imagem_url" type="url" defaultValue={config.imagem_url ?? ""} className={campo} />
          </Rotulo>
        )}

        {item.tipo === "prova" && (
          <Rotulo texto="Nota mínima para concluir (opcional)" dica="Vazio = basta enviar a prova.">
            <input name="nota_minima" type="number" min={0} max={10} step={0.5} defaultValue={config.nota_minima ?? ""} className={campo} />
          </Rotulo>
        )}

        {item.tipo === "flashcards" && (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            O cadastro dos cards chega na etapa de flashcards.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Rotulo texto="Status">
            <select name="status" defaultValue={item.status} className={campo}>
              <option value="rascunho">Rascunho</option>
              <option value="publicado">Publicado</option>
            </select>
          </Rotulo>
          <Rotulo texto="Publicar em (opcional)" dica="Horário de Brasília.">
            <input name="publicar_em" type="datetime-local" defaultValue={isoParaLocal(item.publicar_em)} className={campo} />
          </Rotulo>
          <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
            <input type="checkbox" name="obrigatorio" defaultChecked={item.obrigatorio} />
            Obrigatório para o certificado
          </label>
        </div>

        <div className="flex justify-end">
          <button className={botaoPrimario}>Salvar item</button>
        </div>
      </form>
    </div>
  );
}
