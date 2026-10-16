import "server-only";
import type { Contato } from "@/lib/cadastro";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import { urlDoSite } from "@/lib/url";

// Conta criada na hora de pagar, sem senha nem confirmação de e-mail antes.
// A senha vem depois, pelo e-mail "crie sua senha" (enviado no 1º pagamento).

/**
 * Acha a conta do e-mail ou cria uma nova (sem senha). `nova` diz se foi criada
 * agora: só nesse caso o site entra com ela sem pedir senha.
 */
export async function contaParaPagamento(contato: Contato): Promise<{ usuarioId: string; nova: boolean }> {
  const admin = criarClienteAdmin();
  const { data: existente } = await admin
    .from("perfis")
    .select("id, telefone")
    .eq("email", contato.email)
    .maybeSingle<{ id: string; telefone: string | null }>();
  if (existente) {
    if (!existente.telefone) await admin.from("perfis").update({ telefone: contato.telefone }).eq("id", existente.id);
    return { usuarioId: existente.id, nova: false };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: contato.email,
    // O e-mail é confirmado de fato quando o aluno usa o link "crie sua senha".
    email_confirm: true,
    user_metadata: { nome: contato.nome, primeiro_nome: contato.nome.split(" ")[0] },
  });
  if (error || !data.user) throw new Error(`Não foi possível criar a conta: ${error?.message ?? "sem usuário"}`);
  // O perfil nasce pelo gatilho criar_perfil (migration 0001).
  await admin.from("perfis").update({ telefone: contato.telefone, senha_pendente: true }).eq("id", data.user.id);
  return { usuarioId: data.user.id, nova: true };
}

/**
 * Entra com a conta neste navegador sem senha: gera um link de acesso no
 * servidor (nada é enviado por e-mail) e o usa na hora. Só para conta recém-criada.
 */
export async function entrarSemSenha(email: string) {
  const { data, error } = await criarClienteAdmin().auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error(`Link de acesso não gerado: ${error?.message ?? ""}`);
  const supabase = await criarClienteServidor();
  const { error: erroSessao } = await supabase.auth.verifyOtp({ type: "email", token_hash: data.properties.hashed_token });
  if (erroSessao) throw new Error(`Não foi possível entrar: ${erroSessao.message}`);
}

/**
 * Depois do 1º pagamento: manda o e-mail "crie sua senha" para quem ainda não
 * tem senha. Uma vez por conta (a marcação convite_senha_em é atômica).
 */
export async function enviarConviteDeSenha(assinaturaId: string) {
  const admin = criarClienteAdmin();
  const { data: assinatura } = await admin
    .from("assinaturas")
    .select("usuario_id")
    .eq("id", assinaturaId)
    .maybeSingle<{ usuario_id: string }>();
  if (!assinatura) return;
  const { data: perfil } = await admin
    .from("perfis")
    .update({ convite_senha_em: new Date().toISOString() })
    .eq("id", assinatura.usuario_id)
    .eq("senha_pendente", true)
    .is("convite_senha_em", null)
    .select("email")
    .maybeSingle<{ email: string }>();
  if (!perfil) return;
  await enviarLinkDeSenha(perfil.email);
}

/** E-mail com o link para criar (ou redefinir) a senha. */
export async function enviarLinkDeSenha(email: string) {
  const { error } = await criarClienteAdmin().auth.resetPasswordForEmail(email, {
    redirectTo: `${await urlDoSite()}/auth/confirmar?next=/redefinir-senha`,
  });
  if (error) console.error("Falha ao enviar o e-mail de senha", { email, error: error.message });
}

/** Conta de login do afiliado: usa a existente do e-mail ou cria uma sem senha. */
export async function contaDoAfiliado(email: string, nome: string): Promise<string> {
  const admin = criarClienteAdmin();
  const { data: existente } = await admin.from("perfis").select("id").eq("email", email).maybeSingle<{ id: string }>();
  if (existente) return existente.id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nome, primeiro_nome: nome.split(" ")[0] },
  });
  if (error || !data.user) throw new Error(`Não foi possível criar a conta: ${error?.message ?? "sem usuário"}`);
  await admin.from("perfis").update({ senha_pendente: true }).eq("id", data.user.id);
  return data.user.id;
}
