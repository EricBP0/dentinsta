import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/tipos";

export async function obterSessao() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const usuarioId = data?.claims?.sub;
  if (!usuarioId) return { supabase, perfil: null };

  const { data: perfil } = await supabase
    .from("perfis")
    .select("id, nome, email, papel")
    .eq("id", usuarioId)
    .single<Perfil>();
  return { supabase, perfil };
}

export async function exigirLogin() {
  const sessao = await obterSessao();
  if (!sessao.perfil) redirect("/entrar");
  return { supabase: sessao.supabase, perfil: sessao.perfil };
}

/** Use em toda página e Server Action do backoffice. */
export async function exigirEquipe() {
  const sessao = await exigirLogin();
  if (sessao.perfil.papel === "aluno") redirect("/aluno");
  return sessao;
}

/** Vendas e acessos: só admin (professor não vê faturamento). */
export async function exigirAdmin() {
  const sessao = await exigirLogin();
  if (sessao.perfil.papel !== "admin") redirect(sessao.perfil.papel === "professor" ? "/admin" : "/aluno");
  return sessao;
}

export function ehEquipe(perfil: Perfil | null) {
  return perfil !== null && perfil.papel !== "aluno";
}
