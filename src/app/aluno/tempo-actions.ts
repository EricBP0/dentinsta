"use server";

import { obterSessao } from "@/lib/auth";

/** Soma segundos de estudo ao dia de hoje (o banco limita cada envio e o total diário). */
export async function registrarTempo(segundos: number) {
  const { supabase, perfil } = await obterSessao();
  if (!perfil || !Number.isFinite(segundos) || segundos <= 0) return;
  await supabase.rpc("registrar_tempo", { p_segundos: Math.round(segundos) });
}
