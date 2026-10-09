"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirLogin } from "@/lib/auth";
import { erroDeEnvio, validarFeedback, type EstadoMensagem } from "@/lib/feedback";

export type EstadoFeedback = { erro?: string; enviado?: number };

/** Abre um feedback novo e leva o aluno para a conversa dele. */
export async function enviarFeedback(_: EstadoFeedback, formData: FormData): Promise<EstadoFeedback> {
  const { supabase } = await exigirLogin();
  const validado = validarFeedback(String(formData.get("categoria") ?? ""), String(formData.get("mensagem") ?? ""));
  if (!validado.ok) return { erro: validado.erro };

  const { data, error } = await supabase
    .from("feedbacks")
    .insert({ categoria: validado.categoria, mensagem: validado.mensagem })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { erro: erroDeEnvio(error?.message ?? "") };
  revalidatePath("/aluno/feedback");
  redirect(`/aluno/feedback/${data.id}`);
}

/** Mensagem do aluno numa conversa que já existe. */
export async function responderConversa(_: EstadoMensagem, formData: FormData): Promise<EstadoMensagem> {
  const { supabase } = await exigirLogin();
  const id = String(formData.get("feedback_id") ?? "");
  const { error } = await supabase.rpc("enviar_mensagem_feedback", {
    p_feedback_id: id,
    p_texto: String(formData.get("texto") ?? ""),
  });
  if (error) return { erro: erroDeEnvio(error.message) };
  revalidatePath(`/aluno/feedback/${id}`);
  revalidatePath("/aluno/feedback");
  return { enviado: Date.now() };
}

/** Marca como vistas as mensagens da equipe na conversa e atualiza o aviso do menu. */
export async function marcarConversaVista(id: string) {
  const { supabase } = await exigirLogin();
  const { data } = await supabase.rpc("marcar_conversa_vista", { p_feedback_id: id });
  if (data === true) revalidatePath("/aluno", "layout");
}
