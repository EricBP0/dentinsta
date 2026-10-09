import { ChevronRight, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { Selo } from "@/components/admin-ui";
import { exigirEquipe } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import {
  CATEGORIAS_FEEDBACK,
  COLUNAS_FEEDBACK,
  COLUNAS_MENSAGEM,
  ehCategoria,
  montarConversa,
  SELO_FEEDBACK,
  STATUS_FEEDBACK,
  type Feedback,
  type MensagemFeedback,
} from "@/lib/feedback";
import { faixa, lerPagina, termoIlike, textoParam, totalDePaginas } from "@/lib/listagem";
import { BarraBusca, FiltroSelect, Paginacao, ResumoLista } from "@/components/listagem";
import { CabecalhoPagina } from "@/components/sistema";

type FeedbackAluno = Feedback & { perfis: { nome: string; email: string } };

const POR_PAGINA = 10;
const FILTRO_STATUS: [string, string][] = [
  ["aberto", "Aguardando a equipe"],
  ["respondido", "Aguardando o aluno"],
  ["arquivado", "Encerrados"],
  ["todos", "Todos"],
];

export default async function AdminFeedbacks({ searchParams }: PageProps<"/admin/feedbacks">) {
  const params = await searchParams;
  const status = FILTRO_STATUS.some(([v]) => v === textoParam(params.status)) ? textoParam(params.status) : "aberto";
  const categoria = ehCategoria(textoParam(params.categoria)) ? textoParam(params.categoria) : "";
  const busca = textoParam(params.q);
  const termo = termoIlike(busca);
  const pagina = lerPagina(params.pagina);
  const { supabase } = await exigirEquipe();

  // A busca olha a mensagem de abertura, o resto da conversa e o nome/e-mail do aluno.
  const filtrosBusca: string[] = [];
  if (termo) {
    const [{ data: alunos }, { data: nasMensagens }] = await Promise.all([
      supabase
        .from("perfis")
        .select("id")
        .or(`nome.ilike.%${termo}%,email.ilike.%${termo}%`)
        .limit(200)
        .overrideTypes<{ id: string }[], { merge: false }>(),
      supabase
        .from("feedback_mensagens")
        .select("feedback_id")
        .ilike("texto", `%${termo}%`)
        .limit(200)
        .overrideTypes<{ feedback_id: string }[], { merge: false }>(),
    ]);
    filtrosBusca.push(`mensagem.ilike.%${termo}%`);
    if (alunos?.length) filtrosBusca.push(`usuario_id.in.(${alunos.map((a) => a.id).join(",")})`);
    if (nasMensagens?.length) filtrosBusca.push(`id.in.(${[...new Set(nasMensagens.map((m) => m.feedback_id))].join(",")})`);
  }

  let consulta = supabase
    .from("feedbacks")
    .select(`${COLUNAS_FEEDBACK}, perfis!feedbacks_usuario_id_fkey(nome, email)`, { count: "exact" })
    // Aguardando a equipe: quem espera há mais tempo primeiro.
    .order("atualizado_em", { ascending: status === "aberto" })
    .range(...faixa(pagina, POR_PAGINA));
  if (status !== "todos") consulta = consulta.eq("status", status);
  if (categoria) consulta = consulta.eq("categoria", categoria);
  if (filtrosBusca.length) consulta = consulta.or(filtrosBusca.join(","));
  const { data, count } = await consulta.overrideTypes<FeedbackAluno[], { merge: false }>();
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
  const filtros = { q: busca, status: status === "aberto" ? null : status, categoria };

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · Feedback"
        titulo="Feedback e suporte"
        descricao="Cada feedback é uma conversa com o aluno. Abra para ler tudo e responder."
      />

      <section className="space-y-3">
        <BarraBusca
          acao="/admin/feedbacks"
          busca={busca}
          placeholder="Buscar nas mensagens ou pelo aluno"
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
        <ResumoLista pagina={pagina} porPagina={POR_PAGINA} total={count ?? 0} nome={["conversa", "conversas"]} />
      </section>

      {feedbacks.length === 0 && (
        <p className="rounded-2xl border-2 border-tinta bg-white p-6 text-center text-sm text-slate-600">
          {busca || categoria ? "Nenhuma conversa encontrada com essa busca." : "Nenhuma conversa por aqui."}
        </p>
      )}

      <ul className="space-y-3">
        {feedbacks.map((f) => {
          const conversa = montarConversa(f, mensagens ?? []);
          const ultima = conversa.at(-1)!;
          return (
            <li key={f.id}>
              <Link
                href={`/admin/feedbacks/${f.id}`}
                className="group flex items-center gap-3 rounded-2xl border-2 border-tinta bg-white p-4 transition hover:-translate-y-0.5"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-slate-600">
                      <strong className="text-slate-900">{f.perfis.nome || f.perfis.email}</strong>
                      {f.perfis.nome && <span className="text-slate-500"> · {f.perfis.email}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-violeta-50 px-2 py-0.5 text-xs font-semibold text-violeta-800">
                        {CATEGORIAS_FEEDBACK[f.categoria]}
                      </span>
                      <Selo status={SELO_FEEDBACK[f.status]} texto={STATUS_FEEDBACK[f.status]} />
                    </span>
                  </div>
                  <p className="line-clamp-1 text-sm font-medium text-slate-900">{f.mensagem}</p>
                  {conversa.length > 1 && (
                    <p className="line-clamp-1 text-sm text-slate-600">
                      <strong className="font-semibold">{ultima.da_equipe ? "Equipe" : "Aluno"}:</strong> {ultima.texto}
                    </p>
                  )}
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <MessagesSquare className="size-3.5" /> {conversa.length} {conversa.length === 1 ? "mensagem" : "mensagens"} · última em{" "}
                    {formatarData(ultima.criado_em)}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-tinta" />
              </Link>
            </li>
          );
        })}
      </ul>

      <Paginacao acao="/admin/feedbacks" pagina={pagina} totalPaginas={totalDePaginas(count, POR_PAGINA)} params={filtros} />
    </div>
  );
}
