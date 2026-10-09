"use server";

import { revalidatePath } from "next/cache";
import { exigirEquipe } from "@/lib/auth";
import { erroDeEnvio, type EstadoMensagem } from "@/lib/feedback";

function revalidar(id: string) {
  // O aviso de conversas aguardando a equipe fica no menu do backoffice.
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/feedbacks/${id}`);
}

/** Mensagem da equipe na conversa (reabre se estava encerrada). */
export async function responderFeedback(_: EstadoMensagem, formData: FormData): Promise<EstadoMensagem> {
  const { supabase } = await exigirEquipe();
  const id = String(formData.get("feedback_id") ?? "");
  const { error } = await supabase.rpc("enviar_mensagem_feedback", {
    p_feedback_id: id,
    p_texto: String(formData.get("texto") ?? ""),
  });
  if (error) return { erro: erroDeEnvio(error.message) };
  revalidar(id);
  return { enviado: Date.now() };
}

/** Encerra a conversa ou reabre (volta a aguardar quem deve a próxima mensagem). */
export async function alterarStatusFeedback(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const id = String(formData.get("id") ?? "");
  let status = "arquivado";
  if (formData.get("acao") === "reabrir") {
    const { data: ultima } = await supabase
      .from("feedback_mensagens")
      .select("da_equipe")
      .eq("feedback_id", id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle<{ da_equipe: boolean }>();
    status = ultima?.da_equipe ? "respondido" : "aberto";
  }
  const { error } = await supabase.from("feedbacks").update({ status }).eq("id", id);
  if (error) throw new Error("Não foi possível alterar a conversa.");
  revalidar(id);
}
