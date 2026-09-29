"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; mensagem?: string };

function destinoSeguro(valor: FormDataEntryValue | null) {
  const destino = typeof valor === "string" ? valor : "";
  return destino.startsWith("/") && !destino.startsWith("//") ? destino : "/aluno";
}

export async function entrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("senha") ?? ""),
  });
  if (error) return { erro: "E-mail ou senha inválidos." };
  redirect(destinoSeguro(formData.get("proximo")));
}

export async function cadastrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const senha = String(formData.get("senha") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: senha,
    options: { data: { nome: String(formData.get("nome") ?? "").trim() } },
  });
  if (error) return { erro: "Não foi possível criar a conta. Verifique os dados." };
  if (!data.session) return { mensagem: "Conta criada! Confirme seu e-mail para entrar." };
  redirect("/aluno");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/");
}
