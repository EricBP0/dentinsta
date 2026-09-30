"use server";

import { revalidatePath } from "next/cache";
import { exigirLogin } from "@/lib/auth";

export async function marcarConcluido(formData: FormData) {
  const { supabase, perfil } = await exigirLogin();
  const itemId = String(formData.get("item_id"));
  const concluido = formData.get("concluido") === "true";

  // O RLS só aceita se o item estiver liberado para o aluno.
  await supabase.from("progresso_item").upsert({
    usuario_id: perfil.id,
    item_id: itemId,
    concluido,
    percentual: concluido ? 100 : 0,
    concluido_em: concluido ? new Date().toISOString() : null,
    atualizado_em: new Date().toISOString(),
  });
  revalidatePath("/aluno", "layout");
}
