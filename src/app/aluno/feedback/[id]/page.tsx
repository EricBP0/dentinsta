import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtualizarPeriodicamente } from "@/components/atualizar-periodicamente";
import { Conversa } from "@/components/conversa";
import { CaixaMensagem } from "@/components/conversa-cliente";
import { exigirLogin } from "@/lib/auth";
import {
  CATEGORIAS_FEEDBACK,
  COLUNAS_FEEDBACK,
  COLUNAS_MENSAGEM,
  montarConversa,
  STATUS_FEEDBACK,
  type Feedback,
  type MensagemFeedback,
} from "@/lib/feedback";
import { responderConversa } from "../actions";
import { MarcarVista } from "./marcar-vista";

export default async function ConversaFeedback({ params }: PageProps<"/aluno/feedback/[id]">) {
  const { id } = await params;
  const { supabase, perfil } = await exigirLogin();
  const [{ data: feedback }, { data: mensagens }] = await Promise.all([
    supabase
      .from("feedbacks")
      .select(COLUNAS_FEEDBACK)
      .eq("id", id)
      .eq("usuario_id", perfil.id)
      .maybeSingle<Feedback>(),
    supabase
      .from("feedback_mensagens")
      .select(COLUNAS_MENSAGEM)
      .eq("feedback_id", id)
      .order("criado_em")
      .overrideTypes<MensagemFeedback[], { merge: false }>(),
  ]);
  if (!feedback) notFound();
  const conversa = montarConversa(feedback, mensagens ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Enquanto a conversa está aberta na tela, busca mensagens novas. */}
      <AtualizarPeriodicamente segundos={10} />
      {!feedback.resposta_vista && <MarcarVista id={feedback.id} ultima={conversa.at(-1)!.id} />}

      <div className="space-y-3">
        <Link href="/aluno/feedback" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-tinta">
          <ArrowLeft className="size-4" /> Feedback
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-tinta bg-white px-5 py-4">
          <div>
            <p className="rotulo text-[11px] font-semibold text-violeta-700">{CATEGORIAS_FEEDBACK[feedback.categoria]}</p>
            <h1 className="text-lg font-extrabold tracking-tight text-tinta">Conversa com a equipe</h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              feedback.status === "respondido" ? "bg-lima text-tinta" : "bg-slate-100 text-slate-700"
            }`}
          >
            {STATUS_FEEDBACK[feedback.status]}
          </span>
        </div>
      </div>

      <Conversa mensagens={conversa} lado="aluno" nomeAluno="Você" />

      {feedback.status === "arquivado" ? (
        <p className="flex items-center gap-2 rounded-2xl border-2 border-tinta bg-slate-50 p-4 text-sm text-slate-700">
          <Lock className="size-4 shrink-0" />
          <span>
            A equipe encerrou esta conversa. Se precisar de algo, é só{" "}
            <Link href="/aluno/feedback" className="font-semibold underline">
              mandar um novo feedback
            </Link>
            .
          </span>
        </p>
      ) : (
        <CaixaMensagem acao={responderConversa} feedbackId={feedback.id} placeholder="Responder à equipe" />
      )}
    </div>
  );
}
