import { ChevronRight, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { exigirLogin } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import {
  CATEGORIAS_FEEDBACK,
  COLUNAS_FEEDBACK,
  COLUNAS_MENSAGEM,
  montarConversa,
  STATUS_FEEDBACK,
  type Feedback,
  type MensagemFeedback,
} from "@/lib/feedback";
import { faixa, lerPagina, totalDePaginas } from "@/lib/listagem";
import { Paginacao } from "@/components/listagem";
import { CabecalhoPagina } from "@/components/sistema";
import { FormularioFeedback } from "./formulario";

const POR_PAGINA = 10;

export default async function PaginaFeedback({ searchParams }: PageProps<"/aluno/feedback">) {
  const pagina = lerPagina((await searchParams).pagina);
  const { supabase, perfil } = await exigirLogin();
  const { data, count } = await supabase
    .from("feedbacks")
    .select(COLUNAS_FEEDBACK, { count: "exact" })
    .eq("usuario_id", perfil.id)
    .order("atualizado_em", { ascending: false })
    .range(...faixa(pagina, POR_PAGINA))
    .overrideTypes<Feedback[], { merge: false }>();
  const feedbacks = data ?? [];
  const { data: mensagens } = feedbacks.length
    ? await supabase
        .from("feedback_mensagens")
        .select(COLUNAS_MENSAGEM)
        .in(
          "feedback_id",
          feedbacks.map((f) => f.id),
        )
        .overrideTypes<MensagemFeedback[], { merge: false }>()
    : { data: [] as MensagemFeedback[] };

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        rotulo="Lab · Feedback"
        titulo="Feedback e suporte"
        descricao="Conte o que está bom, o que falta ou o que deu errado. Cada feedback vira uma conversa com a equipe."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <FormularioFeedback />
        </div>

        <section className="space-y-3">
          <h2 className="font-extrabold tracking-tight text-tinta">Suas conversas</h2>
          {feedbacks.length === 0 ? (
            <p className="rounded-2xl border-2 border-tinta bg-white p-6 text-center text-sm text-slate-500">
              Você ainda não mandou nenhum feedback.
            </p>
          ) : (
            <ul className="space-y-3">
              {feedbacks.map((f) => {
                const conversa = montarConversa(f, mensagens ?? []);
                const ultima = conversa.at(-1)!;
                return (
                  <li key={f.id}>
                    <Link
                      href={`/aluno/feedback/${f.id}`}
                      className={`group flex items-center gap-3 rounded-2xl border-2 border-tinta bg-white p-4 transition hover:-translate-y-0.5 ${
                        f.resposta_vista ? "" : "shadow-[4px_4px_0_0_var(--color-lima)]"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-violeta-700">
                            {CATEGORIAS_FEEDBACK[f.categoria]} ·{" "}
                            <span className="font-normal text-slate-500">aberto em {formatarData(f.criado_em)}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            {!f.resposta_vista && (
                              <span className="rounded-full bg-lima px-2 py-0.5 font-bold text-tinta">Nova resposta</span>
                            )}
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                              {STATUS_FEEDBACK[f.status]}
                            </span>
                          </span>
                        </div>
                        <p className="line-clamp-1 text-sm font-medium text-slate-900">{f.mensagem}</p>
                        {conversa.length > 1 && (
                          <p className="line-clamp-1 text-sm text-slate-600">
                            <strong className="font-semibold">{ultima.da_equipe ? "Equipe" : "Você"}:</strong> {ultima.texto}
                          </p>
                        )}
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <MessagesSquare className="size-3.5" /> {conversa.length}{" "}
                          {conversa.length === 1 ? "mensagem" : "mensagens"}
                        </p>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-tinta" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Paginacao acao="/aluno/feedback" pagina={pagina} totalPaginas={totalDePaginas(count, POR_PAGINA)} />
        </section>
      </div>
    </div>
  );
}
