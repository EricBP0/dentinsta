"use server";

import { redirect } from "next/navigation";
import { enviarLinkDeSenha } from "@/lib/conta";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Link de acesso para quem pagou com um e-mail que já tinha conta. Vai para o
 * e-mail da conta (nunca para outro), então não dá acesso a quem não é o dono.
 */
export async function enviarAcessoPorEmail(formData: FormData) {
  const assinaturaId = String(formData.get("assinatura") ?? "");
  if (UUID.test(assinaturaId)) {
    const admin = criarClienteAdmin();
    const { data: assinatura } = await admin
      .from("assinaturas")
      .select("usuario_id")
      .eq("id", assinaturaId)
      .gte("criado_em", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle<{ usuario_id: string }>();
    const { data: perfil } = assinatura
      ? await admin.from("perfis").select("email").eq("id", assinatura.usuario_id).maybeSingle<{ email: string }>()
      : { data: null };
    if (perfil) await enviarLinkDeSenha(perfil.email);
  }
  redirect(`/pagamento/concluido?assinatura=${encodeURIComponent(assinaturaId)}&enviado=1`);
}
