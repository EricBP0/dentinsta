"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { destinoSeguro, urlDoSite } from "@/lib/url";

export type EstadoForm = { erro?: string; mensagem?: string };

export async function entrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("senha") ?? ""),
  });
  if (error) {
    return {
      erro: error.code === "email_not_confirmed" ? "Confirme seu e-mail antes de entrar (veja sua caixa de entrada)." : "E-mail ou senha inválidos.",
    };
  }
  redirect(destinoSeguro(formData.get("proximo")));
}

export async function cadastrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const senha = String(formData.get("senha") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };

  const proximo = destinoSeguro(formData.get("proximo"));
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: senha,
    options: {
      data: { nome: String(formData.get("nome") ?? "").trim() },
      // Depois de confirmar o e-mail, volta para onde o aluno estava (ex.: /assinar).
      emailRedirectTo: `${await urlDoSite()}/auth/confirmar?next=${encodeURIComponent(proximo)}`,
    },
  });
  if (error) return { erro: "Não foi possível criar a conta. Verifique os dados." };
  if (!data.session) return { mensagem: "Conta criada! Enviamos um link de confirmação para o seu e-mail." };
  redirect(proximo);
}

export async function solicitarNovaSenha(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { erro: "Informe seu e-mail." };
  const supabase = await criarClienteServidor();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await urlDoSite()}/auth/confirmar?next=/redefinir-senha`,
  });
  // Mesma resposta exista ou não a conta (não revela quem é cliente).
  return { mensagem: "Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha." };
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/");
}
