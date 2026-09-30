"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirLogin } from "@/lib/auth";

const MENSAGENS: Record<string, string> = {
  "disciplina não concluída": "Conclua todos os itens obrigatórios da disciplina para emitir o certificado.",
  "informe seu nome completo": "Informe seu nome completo.",
};

export async function emitirCertificado(formData: FormData) {
  const { supabase, perfil } = await exigirLogin();
  const disciplinaId = String(formData.get("disciplina_id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim().replace(/\s+/g, " ");

  if (nome.split(" ").length < 2 || nome.length > 120) {
    redirect(`/aluno/certificados?erro=${encodeURIComponent("Informe seu nome completo, como deve aparecer no certificado.")}`);
  }
  // O nome fica gravado no certificado no momento da emissão.
  if (nome !== perfil.nome) await supabase.from("perfis").update({ nome }).eq("id", perfil.id);

  const { error } = await supabase.rpc("emitir_certificado", { p_disciplina_id: disciplinaId });
  if (error) {
    redirect(`/aluno/certificados?erro=${encodeURIComponent(MENSAGENS[error.message] ?? "Não foi possível emitir o certificado.")}`);
  }
  revalidatePath("/aluno", "layout");
  redirect("/aluno/certificados?emitido=1");
}
