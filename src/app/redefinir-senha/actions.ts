"use server";

import { redirect } from "next/navigation";
import type { EstadoForm } from "@/app/entrar/actions";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function definirNovaSenha(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const senha = String(formData.get("senha") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== String(formData.get("confirmacao") ?? "")) return { erro: "As senhas não são iguais." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: "Não foi possível salvar a nova senha. Peça um novo link." };
  // Conta criada no pagamento: agora tem senha.
  const admin = criarClienteAdmin();
  await admin.from("perfis").update({ senha_pendente: false }).eq("id", data.user.id);
  // Afiliado (conta criada pelo backoffice) vai para a área de parceiros.
  const { data: afiliado } = await admin.from("afiliados").select("id").eq("usuario_id", data.user.id).maybeSingle();
  redirect(afiliado ? "/parceiro" : "/aluno");
}
