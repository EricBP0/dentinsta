import { Archive, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { botaoSecundario, Selo } from "@/components/admin-ui";
import { AtualizarPeriodicamente } from "@/components/atualizar-periodicamente";
import { Conversa } from "@/components/conversa";
import { CaixaMensagem } from "@/components/conversa-cliente";
import { exigirEquipe } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import {
  CATEGORIAS_FEEDBACK,
  COLUNAS_FEEDBACK,
  COLUNAS_MENSAGEM,
  montarConversa,
  SELO_FEEDBACK,
  STATUS_FEEDBACK,
  type Feedback,
  type MensagemFeedback,
} from "@/lib/feedback";
import { alterarStatusFeedback, responderFeedback } from "../actions";

type FeedbackAluno = Feedback & { perfis: { nome: string; email: string; criado_em: string } };

export default async function ConversaAdmin({ params }: PageProps<"/admin/feedbacks/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirEquipe();
  const [{ data: feedback }, { data: mensagens }] = await Promise.all([
    supabase
      .from("feedbacks")
      .select(`${COLUNAS_FEEDBACK}, perfis!feedbacks_usuario_id_fkey(nome, email, criado_em)`)
      .eq("id", id)
      .maybeSingle<FeedbackAluno>(),
    supabase
      .from("feedback_mensagens")
      .select(COLUNAS_MENSAGEM)
      .eq("feedback_id", id)
      .order("criado_em")
      .overrideTypes<MensagemFeedback[], { merge: false }>(),
  ]);
  if (!feedback) notFound();
  const conversa = montarConversa(feedback, mensagens ?? []);
  const aluno = feedback.perfis.nome || feedback.perfis.email;
  const encerrada = feedback.status === "arquivado";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AtualizarPeriodicamente segundos={10} />

      <div className="space-y-3">
        <Link href="/admin/feedbacks" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-tinta">
          <ArrowLeft className="size-4" /> Feedbacks
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-tinta bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="rotulo text-[11px] font-semibold text-violeta-700">{CATEGORIAS_FEEDBACK[feedback.categoria]}</p>
            <h1 className="text-lg font-extrabold tracking-tight text-tinta">{aluno}</h1>
            <p className="text-xs text-slate-500">
              {feedback.perfis.email} · aluno desde {formatarData(feedback.perfis.criado_em)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Selo status={SELO_FEEDBACK[feedback.status]} texto={STATUS_FEEDBACK[feedback.status]} />
            <form action={alterarStatusFeedback}>
              <input type="hidden" name="id" value={feedback.id} />
              {encerrada ? (
                <button name="acao" value="reabrir" className={botaoSecundario}>
                  <RotateCcw className="size-3.5" /> Reabrir
                </button>
              ) : (
                <button name="acao" value="encerrar" className={botaoSecundario} title="O aluno não poderá mais responder">
                  <Archive className="size-3.5" /> Encerrar
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      <Conversa mensagens={conversa} lado="equipe" nomeAluno={aluno} vistaPeloAluno={feedback.resposta_vista} />

      {encerrada && (
        <p className="rounded-2xl border-2 border-tinta bg-slate-50 p-3 text-sm text-slate-700">
          Conversa encerrada: o aluno não pode responder. Se você mandar uma mensagem, ela reabre.
        </p>
      )}
      <CaixaMensagem acao={responderFeedback} feedbackId={feedback.id} placeholder={`Responder a ${aluno}`} />
    </div>
  );
}
