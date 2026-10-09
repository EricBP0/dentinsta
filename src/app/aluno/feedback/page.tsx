import { MessageSquareReply } from "lucide-react";
import { exigirLogin } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import { CATEGORIAS_FEEDBACK, STATUS_FEEDBACK, type Feedback } from "@/lib/feedback";
import { faixa, lerPagina, totalDePaginas } from "@/lib/listagem";
import { Paginacao } from "@/components/listagem";
import { CabecalhoPagina } from "@/components/sistema";
import { FormularioFeedback } from "./formulario";
import { MarcarVistas, SeloNovaResposta } from "./marcar-vistas";

const POR_PAGINA = 10;

export default async function PaginaFeedback({ searchParams }: PageProps<"/aluno/feedback">) {
  const pagina = lerPagina((await searchParams).pagina);
  const { supabase, perfil } = await exigirLogin();
  const { data, count } = await supabase
    .from("feedbacks")
    .select("id, categoria, mensagem, status, resposta, respondido_em, resposta_vista, criado_em", { count: "exact" })
    .eq("usuario_id", perfil.id)
    .order("criado_em", { ascending: false })
    .range(...faixa(pagina, POR_PAGINA))
    .overrideTypes<Feedback[], { merge: false }>();
  const feedbacks = data ?? [];
  const temNovas = feedbacks.some((f) => !f.resposta_vista);

  return (
    <div className="space-y-8">
      {temNovas && <MarcarVistas />}
      <CabecalhoPagina
        rotulo="Lab · Feedback"
        titulo="Feedback"
        descricao="Sua opinião ajuda a melhorar a plataforma. Conte o que está bom, o que falta e o que deu errado."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <FormularioFeedback />
        </div>

        <section className="space-y-3">
          <h2 className="font-extrabold tracking-tight text-tinta">Seus feedbacks</h2>
          {feedbacks.length === 0 ? (
            <p className="rounded-2xl border-2 border-tinta bg-white p-6 text-center text-sm text-slate-500">
              Você ainda não mandou nenhum feedback.
            </p>
          ) : (
            <ul className="space-y-3">
              {feedbacks.map((f) => (
                <li key={f.id} className="space-y-3 rounded-2xl border-2 border-tinta bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-violeta-700">
                      {CATEGORIAS_FEEDBACK[f.categoria]} · <span className="font-normal text-slate-500">{formatarData(f.criado_em)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <SeloNovaResposta nova={!f.resposta_vista} />
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          f.status === "respondido" ? "bg-violeta-50 text-violeta-800" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {f.status === "arquivado" && f.resposta ? STATUS_FEEDBACK.respondido : STATUS_FEEDBACK[f.status]}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-slate-800">{f.mensagem}</p>
                  {f.resposta && (
                    <div className="space-y-1 rounded-xl border-l-4 border-lima bg-violeta-50 p-3 text-sm">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-violeta-800">
                        <MessageSquareReply className="size-3.5" /> Resposta da equipe
                        {f.respondido_em && <span className="font-normal text-slate-500">· {formatarData(f.respondido_em)}</span>}
                      </p>
                      <p className="whitespace-pre-wrap text-slate-800">{f.resposta}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Paginacao acao="/aluno/feedback" pagina={pagina} totalPaginas={totalDePaginas(count, POR_PAGINA)} />
        </section>
      </div>
    </div>
  );
}
