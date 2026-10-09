"use server";

import { revalidatePath } from "next/cache";
import { exigirLogin } from "@/lib/auth";
import { validarFeedback } from "@/lib/feedback";

export type EstadoFeedback = { erro?: string; enviado?: number };

export async function enviarFeedback(_: EstadoFeedback, formData: FormData): Promise<EstadoFeedback> {
  const { supabase } = await exigirLogin();
  const validado = validarFeedback(String(formData.get("categoria") ?? ""), String(formData.get("mensagem") ?? ""));
  if (!validado.ok) return { erro: validado.erro };

  const { error } = await supabase.from("feedbacks").insert({ categoria: validado.categoria, mensagem: validado.mensagem });
  if (error) {
    return {
      erro: error.message.includes("limite_feedbacks")
        ? "Você já enviou vários feedbacks na última hora. Tente de novo mais tarde."
        : "Não foi possível enviar agora. Tente de novo em instantes.",
    };
  }
  revalidatePath("/aluno/feedback");
  return { enviado: Date.now() };
}

/** Marca as respostas da equipe como vistas e atualiza o aviso do menu. */
export async function marcarRespostasVistas() {
  const { supabase } = await exigirLogin();
  const { data } = await supabase.rpc("marcar_respostas_vistas");
  if (Number(data) > 0) revalidatePath("/aluno", "layout");
}
