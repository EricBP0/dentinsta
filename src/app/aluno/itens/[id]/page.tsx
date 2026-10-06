import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoRenovar } from "@/components/cadeado";
import { ResumoEstruturado } from "@/components/resumo/resumo-estruturado";
import { SessaoEstudo } from "@/app/aluno/flashcards/sessao-estudo";
import { exigirLogin } from "@/lib/auth";
import { carregarResumo, carregarSessao } from "@/lib/flashcards/sessao";
import { assinarMidiaResumo } from "@/lib/resumos/midia";
import { COLUNAS_ITEM, NOME_TIPO_ITEM, type ConfigItem, type Item } from "@/lib/tipos";
import { marcarConcluido } from "./actions";

export default async function PaginaItem({ params }: PageProps<"/aluno/itens/[id]">) {
  const { id } = await params;
  const { supabase, perfil } = await exigirLogin();

  const { data: item } = await supabase
    .from("itens")
    .select(`${COLUNAS_ITEM}, modulos(disciplinas(nome, slug))`)
    .eq("id", id)
    .maybeSingle<Item & { modulos: { disciplinas: { nome: string; slug: string } } }>();
  if (!item) notFound();

  const [{ data: conteudo }, { data: progresso }] = await Promise.all([
    supabase.rpc("conteudo_item", { p_item_id: id }),
    supabase
      .from("progresso_item")
      .select("concluido")
      .eq("usuario_id", perfil.id)
      .eq("item_id", id)
      .maybeSingle<{ concluido: boolean }>(),
  ]);
  // null = item bloqueado para este aluno (a função confere a janela de acesso).
  const config = conteudo as ConfigItem | null;
  const disciplina = item.modulos.disciplinas;
  const concluido = progresso?.concluido ?? false;

  return (
    <div className="space-y-6">
      <Link href={`/aluno/disciplinas/${disciplina.slug}`} className="text-sm text-slate-600 hover:text-slate-900">
        ← {disciplina.nome}
      </Link>
      <header>
        <p className="text-sm text-slate-500">{NOME_TIPO_ITEM[item.tipo]}</p>
        <h1 className="text-2xl font-bold text-tinta">{item.titulo}</h1>
      </header>

      {config && item.tipo === "flashcards" ? (
        <Deck itemId={item.id} usuarioId={perfil.id} concluido={concluido} />
      ) : config ? (
        <>
          <ConteudoItem tipo={item.tipo} config={config} />
          <form action={marcarConcluido}>
            <input type="hidden" name="item_id" value={item.id} />
            <input type="hidden" name="concluido" value={String(!concluido)} />
            <button
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                concluido ? "border border-slate-300 text-slate-700" : "bg-teal-700 text-white hover:bg-teal-800"
              }`}
            >
              {concluido ? "✅ Concluído — desmarcar" : "Marcar como concluído"}
            </button>
          </form>
        </>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p>Este conteúdo foi publicado depois do seu período de novidades.</p>
          <BotaoRenovar />
        </div>
      )}
    </div>
  );
}

async function Deck({ itemId, usuarioId, concluido }: { itemId: string; usuarioId: string; concluido: boolean }) {
  const { supabase } = await exigirLogin();
  const [cards, [resumo]] = await Promise.all([
    carregarSessao(supabase, usuarioId, itemId),
    carregarResumo(supabase, itemId),
  ]);
  if (!resumo) return <p className="rounded-xl bg-slate-100 p-6 text-slate-600">Este deck ainda não tem cards.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-slate-600">
        {resumo.vistos} de {resumo.total} cards vistos
        {concluido ? " · ✅ deck concluído" : " · veja todos os cards pelo menos uma vez para concluir"}
      </p>
      <SessaoEstudo cards={cards} />
    </div>
  );
}

function ConteudoItem({ tipo, config }: { tipo: Item["tipo"]; config: ConfigItem }) {
  switch (tipo) {
    case "video":
      return config.video_url ? (
        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          <iframe
            src={config.video_url}
            className="h-full w-full"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <Vazio />
      );
    case "resumo":
      if (config.resumo || config.pdf_caminho) return <ResumoImportado config={config} />;
      return (
        <div className="space-y-4">
          {config.conteudo && (
            <article className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-6 leading-relaxed text-slate-800">
              {config.conteudo}
            </article>
          )}
          {config.pdf_url && (
            <a href={config.pdf_url} target="_blank" className="text-sm font-medium text-teal-700 underline">
              Abrir PDF
            </a>
          )}
          {!config.conteudo && !config.pdf_url && <Vazio />}
        </div>
      );
    case "mapa_mental":
      return config.imagem_url ? (
        <a href={config.imagem_url} target="_blank" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem de origem externa configurável */}
          <img src={config.imagem_url} alt="Mapa mental" className="w-full rounded-xl border border-slate-200" />
          <span className="mt-2 block text-sm text-teal-700 underline">Abrir em tamanho real</span>
        </a>
      ) : (
        <Vazio />
      );
    default:
      return <p className="rounded-xl bg-slate-100 p-6 text-slate-600">Em breve nesta plataforma.</p>;
  }
}

function Vazio() {
  return <p className="rounded-xl bg-slate-100 p-6 text-slate-600">Conteúdo ainda não cadastrado.</p>;
}

/** Resumo vindo dos PDFs: texto no site + PDF completo para baixar. */
async function ResumoImportado({ config }: { config: ConfigItem }) {
  const midia = await assinarMidiaResumo(config);
  return (
    <div className="space-y-6">
      {midia.pdf && (
        <a
          href={midia.pdf}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Abrir o PDF completo
        </a>
      )}
      {config.resumo ? <ResumoEstruturado resumo={config.resumo} figuras={midia.figuras} /> : !midia.pdf && <Vazio />}
    </div>
  );
}
