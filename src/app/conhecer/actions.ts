"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { contatoDoFormulario, validarContato, type EstadoContato } from "@/lib/cadastro";
import { COOKIE_LEAD } from "@/lib/lead";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/** "Quero conhecer": guarda o lead e mostra os planos (sem pedir os dados de novo ao pagar). */
export async function registrarLead(_: EstadoContato, formData: FormData): Promise<EstadoContato> {
  const valores = contatoDoFormulario(formData);
  if (formData.get("site")) return { erro: "Não foi possível continuar.", valores }; // campo isca para robôs
  const contato = validarContato(valores);
  if ("erro" in contato) return { ...contato, valores };

  const { data, error } = await criarClienteAdmin()
    .from("leads")
    .upsert({ ...contato, origem: "conhecer", atualizado_em: new Date().toISOString() }, { onConflict: "email" })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    console.error("Falha ao salvar lead", { error });
    return { erro: "Não foi possível continuar. Tente de novo em instantes.", valores };
  }
  (await cookies()).set(COOKIE_LEAD, data.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
  redirect("/assinar");
}
