import { Archive, MessageSquareReply, RotateCcw } from "lucide-react";
import { botaoPrimario, botaoSecundario, campo, Selo } from "@/components/admin-ui";
import { exigirEquipe } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import { CATEGORIAS_FEEDBACK, ehCategoria, STATUS_FEEDBACK, type Feedback } from "@/lib/feedback";
import { faixa, lerPagina, termoIlike, textoParam, totalDePaginas } from "@/lib/listagem";
import { BarraBusca, FiltroSelect, Paginacao, ResumoLista } from "@/components/listagem";
import { CabecalhoPagina } from "@/components/sistema";
import { alterarStatusFeedback, responderFeedback } from "./actions";

type FeedbackAluno = Feedback & { perfis: { nome: string; email: string } };

const POR_PAGINA = 10;
const FILTRO_STATUS: [string, string][] = [
  ["aberto", "Aguardando resposta"],
  ["respondido", "Respondidos"],
  ["arquivado", "Arquivados"],
  ["todos", "Todos"],
];
const SELO: Record<string, string> = { aberto: "em_breve", respondido: "publicada", arquivado: "arquivada" };

export default async function AdminFeedbacks({ searchParams }: PageProps<"/admin/feedbacks">) {
  const params = await searchParams;
  const status = FILTRO_STATUS.some(([v]) => v === textoParam(params.status)) ? textoParam(params.status) : "aberto";
  const categoria = ehCategoria(textoParam(params.categoria)) ? textoParam(params.categoria) : "";
  const busca = textoParam(params.q);
  const termo = termoIlike(busca);
  const pagina = lerPagina(params.pagina);
  const { supabase } = await exigirEquipe();

  // A busca olha a mensagem e o nome/e-mail do aluno.
  let idsAlunos: string[] = [];
  if (termo) {
    const { data } = await supabase
      .from("perfis")
      .select("id")
      .or(`nome.ilike.%${termo}%,email.ilike.%${termo}%`)
      .limit(200)
      .overrideTypes<{ id: string }[], { merge: false }>();
    idsAlunos = (data ?? []).map((p) => p.id);
  }

  let consulta = supabase
    .from("feedbacks")
    .select(
      "id, categoria, mensagem, status, resposta, respondido_em, resposta_vista, criado_em, perfis!feedbacks_usuario_id_fkey(nome, email)",
      { count: "exact" },
    )
    .order("criado_em", { ascending: status === "aberto" })
    .range(...faixa(pagina, POR_PAGINA));
  if (status !== "todos") consulta = consulta.eq("status", status);
  if (categoria) consulta = consulta.eq("categoria", categoria);
  if (termo)
    consulta = consulta.or(
      [`mensagem.ilike.%${termo}%`, idsAlunos.length ? `usuario_id.in.(${idsAlunos.join(",")})` : null].filter(Boolean).join(","),
    );
  const { data, count } = await consulta.overrideTypes<FeedbackAluno[], { merge: false }>();
  const feedbacks = data ?? [];
  const filtros = { q: busca, status: status === "aberto" ? null : status, categoria };

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · Feedback"
        titulo="Feedback dos alunos"
        descricao="Sugestões, problemas e elogios enviados pela área do aluno. A resposta aparece para o aluno na página de feedback."
      />

      <section className="space-y-3">
        <BarraBusca
          acao="/admin/feedbacks"
          busca={busca}
          placeholder="Buscar na mensagem ou pelo aluno"
          limpar={Boolean(busca || filtros.status || categoria)}
        >
          <FiltroSelect nome="status" valor={status} rotulo="Status" opcoes={FILTRO_STATUS} />
          <FiltroSelect
            nome="categoria"
            valor={categoria}
            rotulo="Assunto"
            todos="Todos os assuntos"
            opcoes={Object.entries(CATEGORIAS_FEEDBACK)}
          />
        </BarraBusca>
        <ResumoLista pagina={pagina} porPagina={POR_PAGINA} total={count ?? 0} nome={["feedback", "feedbacks"]} />
      </section>

      {feedbacks.length === 0 && (
        <p className="rounded-2xl border-2 border-tinta bg-white p-6 text-center text-sm text-slate-600">
          {busca || categoria ? "Nenhum feedback encontrado com essa busca." : "Nenhum feedback por aqui."}
        </p>
      )}

      {feedbacks.map((f) => (
        <article key={f.id} className="space-y-4 rounded-2xl border-2 border-tinta bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-slate-600">
              <strong className="text-slate-900">{f.perfis.nome || f.perfis.email}</strong>
              {f.perfis.nome && <span className="text-slate-500"> · {f.perfis.email}</span>} · {formatarData(f.criado_em)}
            </span>
            <span className="flex items-center gap-2">
              <span className="rounded-full bg-violeta-50 px-2 py-0.5 text-xs font-semibold text-violeta-800">
                {CATEGORIAS_FEEDBACK[f.categoria]}
              </span>
              <Selo status={SELO[f.status]} texto={STATUS_FEEDBACK[f.status]} />
            </span>
          </div>

          <p className="rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-800">{f.mensagem}</p>

          {f.resposta && (
            <div className="space-y-1 rounded-xl border-l-4 border-lima bg-violeta-50 p-3 text-sm">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-violeta-800">
                <MessageSquareReply className="size-3.5" /> Resposta enviada
                {f.respondido_em && <span className="font-normal text-slate-500">· {formatarData(f.respondido_em)}</span>}
                {!f.resposta_vista && <span className="font-normal text-slate-500">· ainda não vista pelo aluno</span>}
              </p>
              <p className="whitespace-pre-wrap text-slate-800">{f.resposta}</p>
            </div>
          )}

          <details open={f.status === "aberto"} className="group border-t border-slate-100 pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-tinta group-open:mb-3">
              {f.resposta ? "Editar resposta" : "Responder"}
            </summary>
            <form action={responderFeedback} className="space-y-3">
              <input type="hidden" name="id" value={f.id} />
              <textarea
                name="resposta"
                required
                rows={3}
                maxLength={4000}
                defaultValue={f.resposta ?? ""}
                placeholder="Resposta para o aluno"
                className={campo}
              />
              <button className={botaoPrimario}>{f.resposta ? "Atualizar resposta" : "Enviar resposta"}</button>
            </form>
          </details>

          <form action={alterarStatusFeedback} className="flex justify-end">
            <input type="hidden" name="id" value={f.id} />
            {f.status === "arquivado" ? (
              <button name="status" value={f.resposta ? "respondido" : "aberto"} className={botaoSecundario}>
                <RotateCcw className="size-3.5" /> Reabrir
              </button>
            ) : (
              <button name="status" value="arquivado" className={botaoSecundario}>
                <Archive className="size-3.5" /> Arquivar
              </button>
            )}
          </form>
        </article>
      ))}

      <Paginacao acao="/admin/feedbacks" pagina={pagina} totalPaginas={totalDePaginas(count, POR_PAGINA)} params={filtros} />
    </div>
  );
}
