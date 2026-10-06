import Link from "next/link";
import { notFound } from "next/navigation";
import {
  botaoPerigo,
  botaoPrimario,
  botaoSecundario,
  campo,
  Rotulo,
  Selo,
} from "@/components/admin-ui";
import { exigirEquipe } from "@/lib/auth";
import { isoParaLocal } from "@/lib/datas";
import {
  COLUNAS_ITEM,
  NOME_STATUS_DISCIPLINA,
  NOME_TIPO_ITEM,
  type Disciplina,
  type Item,
  type Modulo,
  type TipoItem,
} from "@/lib/tipos";
import {
  alternarItem,
  criarItem,
  criarModulo,
  excluirDisciplina,
  excluirItem,
  excluirModulo,
  mover,
  salvarDisciplina,
  salvarModulo,
} from "../../actions";

export default async function AdminDisciplina({ params }: PageProps<"/admin/disciplinas/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirEquipe();

  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("*")
    .eq("id", id)
    .maybeSingle<Disciplina>();
  if (!disciplina) notFound();

  const { data: modulos } = await supabase
    .from("modulos")
    .select("*")
    .eq("disciplina_id", id)
    .order("ordem")
    .overrideTypes<Modulo[], { merge: false }>();
  const idsModulos = (modulos ?? []).map((m) => m.id);
  const { data: itens } = idsModulos.length
    ? await supabase
        .from("itens")
        .select(COLUNAS_ITEM)
        .in("modulo_id", idsModulos)
        .order("ordem")
        .overrideTypes<Item[], { merge: false }>()
    : { data: [] as Item[] };

  const obrigatorios = (itens ?? []).filter((i) => i.obrigatorio && i.status === "publicado").length;

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-slate-600 hover:text-slate-900">
        ← Disciplinas
      </Link>

      <form action={salvarDisciplina} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <input type="hidden" name="id" value={disciplina.id} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-slate-900">{disciplina.nome}</h1>
          <Selo status={disciplina.status} texto={NOME_STATUS_DISCIPLINA[disciplina.status]} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Rotulo texto="Nome">
            <input name="nome" defaultValue={disciplina.nome} required className={campo} />
          </Rotulo>
          <Rotulo texto="Endereço (slug)" dica={`/aluno/disciplinas/${disciplina.slug}`}>
            <input name="slug" defaultValue={disciplina.slug} className={campo} />
          </Rotulo>
        </div>
        <Rotulo texto="Descrição">
          <textarea name="descricao" defaultValue={disciplina.descricao} rows={3} className={campo} />
        </Rotulo>
        <div className="grid gap-4 sm:grid-cols-3">
          <Rotulo texto="Período sugerido">
            <input name="periodo_sugerido" type="number" min={1} max={12} defaultValue={disciplina.periodo_sugerido ?? ""} className={campo} />
          </Rotulo>
          <Rotulo texto="Carga horária (h)" dica="Vai no certificado">
            <input name="carga_horaria_h" type="number" min={0} defaultValue={disciplina.carga_horaria_h} className={campo} />
          </Rotulo>
          <Rotulo texto="Capa (URL da imagem)">
            <input name="capa_url" defaultValue={disciplina.capa_url ?? ""} placeholder="/capas/nome.png ou https://…" className={campo} />
          </Rotulo>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Rotulo
            texto="Status"
            dica="Rascunho: só a equipe vê · Em breve: aparece no catálogo sem conteúdo · Publicada: liberada · Arquivada: sai do catálogo"
          >
            <select name="status" defaultValue={disciplina.status} className={campo}>
              {Object.entries(NOME_STATUS_DISCIPLINA).map(([valor, nome]) => (
                <option key={valor} value={valor}>{nome}</option>
              ))}
            </select>
          </Rotulo>
          <Rotulo texto="Publicar em (opcional)" dica="Horário de Brasília. Vazio = imediatamente.">
            <input name="publicar_em" type="datetime-local" defaultValue={isoParaLocal(disciplina.publicar_em)} className={campo} />
          </Rotulo>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Certificado: <strong>{obrigatorios}</strong> {obrigatorios === 1 ? "item obrigatório publicado" : "itens obrigatórios publicados"}
          </p>
          <button className={botaoPrimario}>Salvar disciplina</button>
        </div>
      </form>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Módulos e itens</h2>

        {(modulos ?? []).map((modulo, indice) => (
          <div key={modulo.id} className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
              <form action={salvarModulo} className="flex flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={modulo.id} />
                <input name="titulo" defaultValue={modulo.titulo} className={`${campo} min-w-48 flex-1 font-medium`} />
                <select name="status" defaultValue={modulo.status} className={`${campo} w-auto`}>
                  <option value="rascunho">Rascunho</option>
                  <option value="publicado">Publicado</option>
                </select>
                <button className={botaoSecundario}>Salvar</button>
              </form>
              <BotoesOrdem tabela="modulos" id={modulo.id} primeiro={indice === 0} ultimo={indice === (modulos?.length ?? 0) - 1} />
              <form action={excluirModulo}>
                <input type="hidden" name="id" value={modulo.id} />
                <button className={botaoPerigo}>Excluir</button>
              </form>
            </div>

            <ListaItens itens={(itens ?? []).filter((i) => i.modulo_id === modulo.id)} />

            <form action={criarItem} className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-3">
              <input type="hidden" name="modulo_id" value={modulo.id} />
              <select name="tipo" className={`${campo} w-auto`}>
                {Object.entries(NOME_TIPO_ITEM).map(([valor, nome]) => (
                  <option key={valor} value={valor}>{nome}</option>
                ))}
              </select>
              <input name="titulo" placeholder="Título do novo item" required className={`${campo} min-w-48 flex-1`} />
              <label className="flex items-center gap-1 text-sm text-slate-700">
                <input type="checkbox" name="obrigatorio" /> Obrigatório
              </label>
              <button className={botaoSecundario}>+ Adicionar item</button>
            </form>
          </div>
        ))}

        <form action={criarModulo} className="flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="disciplina_id" value={disciplina.id} />
          <input name="titulo" placeholder="Título do novo módulo" required className={campo} />
          <button className={`${botaoPrimario} shrink-0`}>Adicionar módulo</button>
        </form>
      </section>

      <form action={excluirDisciplina} className="border-t border-slate-200 pt-6">
        <input type="hidden" name="id" value={disciplina.id} />
        <button className={botaoPerigo}>Excluir disciplina e todo o conteúdo</button>
        <p className="mt-1 text-xs text-slate-500">Prefira arquivar: quem já estudou mantém o histórico.</p>
      </form>
    </div>
  );
}

function ListaItens({ itens }: { itens: Item[] }) {
  if (itens.length === 0) return <p className="p-3 text-sm text-slate-500">Nenhum item neste módulo.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {itens.map((item, indice) => (
        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="w-24 text-xs text-slate-500">{NOME_TIPO_ITEM[item.tipo as TipoItem]}</span>
            <Link href={`/admin/itens/${item.id}`} className="font-medium text-slate-900 hover:text-violeta-700">
              {item.titulo}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <form action={alternarItem}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="campo" value="obrigatorio" />
              <input type="hidden" name="valor" value={String(!item.obrigatorio)} />
              <button className={`${botaoSecundario} ${item.obrigatorio ? "border-violeta-600 text-violeta-800" : ""}`}>
                {item.obrigatorio ? "✓ Obrigatório" : "Opcional"}
              </button>
            </form>
            <form action={alternarItem}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="campo" value="status" />
              <input type="hidden" name="valor" value={item.status === "publicado" ? "rascunho" : "publicado"} />
              <button className={botaoSecundario}>
                {item.status === "publicado" ? "Publicado" : "Rascunho"}
              </button>
            </form>
            <BotoesOrdem tabela="itens" id={item.id} primeiro={indice === 0} ultimo={indice === itens.length - 1} />
            <form action={excluirItem}>
              <input type="hidden" name="id" value={item.id} />
              <button className={botaoPerigo}>Excluir</button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

function BotoesOrdem({ tabela, id, primeiro, ultimo }: { tabela: "modulos" | "itens"; id: string; primeiro: boolean; ultimo: boolean }) {
  return (
    <>
      {(["cima", "baixo"] as const).map((direcao) => (
        <form key={direcao} action={mover}>
          <input type="hidden" name="tabela" value={tabela} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="direcao" value={direcao} />
          <button
            disabled={direcao === "cima" ? primeiro : ultimo}
            aria-label={direcao === "cima" ? "Mover para cima" : "Mover para baixo"}
            className={`${botaoSecundario} disabled:opacity-30`}
          >
            {direcao === "cima" ? "↑" : "↓"}
          </button>
        </form>
      ))}
    </>
  );
}
