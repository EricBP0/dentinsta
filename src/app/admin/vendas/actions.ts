"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";

export async function liberarAcesso(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const meses = Number(formData.get("meses"));
  const plano = String(formData.get("plano") ?? "completo");

  const { data: perfil } = await supabase.from("perfis").select("id").ilike("email", email).maybeSingle<{ id: string }>();
  if (!perfil) redirect(`/admin/vendas?aviso=${encodeURIComponent(`Nenhuma conta com o e-mail ${email}.`)}`);

  const { error } = await supabase.rpc("conceder_assinatura_manual", {
    p_usuario_id: perfil.id,
    p_plano: plano,
    p_meses: meses,
  });
  if (error) redirect(`/admin/vendas?aviso=${encodeURIComponent("Não foi possível liberar o acesso.")}`);
  revalidatePath("/admin/vendas");
  redirect(
    `/admin/vendas?aviso=${encodeURIComponent(`Plano ${plano} por ${meses} meses liberado para ${email}.`)}&busca=${encodeURIComponent(email)}`,
  );
}

export async function revogarAcesso(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const { error } = await supabase.rpc("revogar_acesso", { p_usuario_id: String(formData.get("usuario_id")) });
  if (error) throw new Error("Não foi possível revogar o acesso.");
  revalidatePath("/admin/vendas");
}
