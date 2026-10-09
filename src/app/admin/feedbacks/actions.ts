"use server";

import { revalidatePath } from "next/cache";
import { exigirEquipe } from "@/lib/auth";
import { ehStatus, MENSAGEM_MAX } from "@/lib/feedback";

function revalidar() {
  // O aviso de feedbacks abertos fica no menu do backoffice.
  revalidatePath("/admin", "layout");
}

export async function responderFeedback(formData: FormData) {
  const { supabase, perfil } = await exigirEquipe();
  const id = String(formData.get("id") ?? "");
  const resposta = String(formData.get("resposta") ?? "").trim().slice(0, MENSAGEM_MAX);
  if (!resposta) throw new Error("Escreva a resposta.");

  const { error } = await supabase
    .from("feedbacks")
    .update({
      resposta,
      status: "respondido",
      respondido_por: perfil.id,
      respondido_em: new Date().toISOString(),
      resposta_vista: false,
    })
    .eq("id", id);
  if (error) throw new Error("Não foi possível salvar a resposta.");
  revalidar();
}

/** Arquivar (sem resposta necessária) ou reabrir. */
export async function alterarStatusFeedback(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!ehStatus(status)) throw new Error("Status inválido.");
  const { error } = await supabase.from("feedbacks").update({ status }).eq("id", id);
  if (error) throw new Error("Não foi possível alterar o feedback.");
  revalidar();
}
