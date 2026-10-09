"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { exigirLogin } from "@/lib/auth";
import { corrigirPendentes } from "@/lib/ia/pendentes";

export type EstadoSimulado = { erro?: string };

const MENSAGENS: Record<string, string> = {
  "sem acesso": "Os simulados não fazem parte do seu plano.",
  "disciplina indisponível": "Esta disciplina não está disponível para você.",
  "nenhuma questão encontrada com esses filtros": "Nenhuma questão encontrada com esses filtros. Tente outros.",
};

export async function criarSimulado(_: EstadoSimulado, formData: FormData): Promise<EstadoSimulado> {
  const { supabase } = await exigirLogin();
  const tipo = String(formData.get("tipo") ?? "");
  const dificuldade = Number(formData.get("dificuldade"));
  const tema = String(formData.get("tema") ?? "");

  const { data, error } = await supabase.rpc("gerar_simulado", {
    p_disciplina_id: String(formData.get("disciplina_id") ?? ""),
    p_quantidade: Number(formData.get("quantidade")) || 10,
    p_tipo: tipo === "objetiva" || tipo === "discursiva" ? tipo : null,
    p_dificuldade: [1, 2, 3].includes(dificuldade) ? dificuldade : null,
    p_temas: tema ? [tema] : null,
  });
  if (error) return { erro: MENSAGENS[error.message] ?? "Não foi possível criar o simulado." };

  redirect(`/aluno/simulados/${data}`);
}

export async function enviarSimulado(formData: FormData) {
  const { supabase } = await exigirLogin();
  const simuladoId = String(formData.get("simulado_id"));

  const respostas: Record<string, string> = {};
  for (const [chave, valor] of formData.entries()) {
    if (chave.startsWith("q_") && typeof valor === "string") respostas[chave.slice(2)] = valor;
  }

  const { error } = await supabase.rpc("enviar_simulado", { p_simulado_id: simuladoId, p_respostas: respostas });
  if (error && error.message !== "simulado já enviado") {
    throw new Error("Não foi possível enviar o simulado. Tente novamente.");
  }

  // As objetivas já estão corrigidas; as discursivas são corrigidas pela IA depois da resposta.
  after(() => corrigirPendentes(simuladoId));
  revalidatePath("/aluno/simulados");
  redirect(`/aluno/simulados/${simuladoId}`);
}

export async function tentarCorrigirDeNovo(formData: FormData) {
  const { supabase } = await exigirLogin();
  const simuladoId = String(formData.get("simulado_id"));
  // Garante que o simulado é do aluno logado (RLS) antes de usar a chave secreta.
  const { data } = await supabase.from("simulados").select("id").eq("id", simuladoId).maybeSingle();
  if (!data) return;
  after(() => corrigirPendentes(simuladoId));
  redirect(`/aluno/simulados/${simuladoId}`);
}

export async function contestar(formData: FormData) {
  const { supabase } = await exigirLogin();
  const { error } = await supabase.rpc("contestar_correcao", {
    p_resposta_id: String(formData.get("resposta_id")),
    p_motivo: String(formData.get("motivo") ?? ""),
  });
  if (error) throw new Error("Não foi possível registrar a contestação.");
  revalidatePath(`/aluno/simulados/${String(formData.get("simulado_id"))}`);
}
