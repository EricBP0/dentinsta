"use server";

import { revalidatePath } from "next/cache";
import { exigirEquipe } from "@/lib/auth";
import { importarCardsCsv, removerRepetidos, validarCard } from "@/lib/flashcards/cards";

export type EstadoCards = { erro?: string; mensagem?: string; erros?: { linha: number; mensagem: string }[] };

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "");
}

function revalidar(itemId: string) {
  revalidatePath(`/admin/itens/${itemId}`);
  revalidatePath("/aluno", "layout");
}

async function proximaOrdem(supabase: Awaited<ReturnType<typeof exigirEquipe>>["supabase"], itemId: string) {
  const { data } = await supabase
    .from("flashcards")
    .select("ordem")
    .eq("item_id", itemId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle<{ ordem: number }>();
  return (data?.ordem ?? 0) + 1;
}

export async function criarCard(_: EstadoCards, formData: FormData): Promise<EstadoCards> {
  const { supabase } = await exigirEquipe();
  const itemId = texto(formData, "item_id");
  const validacao = validarCard({
    frente: texto(formData, "frente"),
    verso: texto(formData, "verso"),
    imagem_url: texto(formData, "imagem_url"),
  });
  if ("erro" in validacao) return { erro: `Card inválido: ${validacao.erro}.` };

  const { error } = await supabase
    .from("flashcards")
    .insert({ ...validacao.card, item_id: itemId, ordem: await proximaOrdem(supabase, itemId) });
  if (error) return { erro: `Não foi possível salvar: ${error.message}` };
  revalidar(itemId);
  return { mensagem: "Card adicionado." };
}

export async function salvarCard(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const itemId = texto(formData, "item_id");
  const validacao = validarCard({
    frente: texto(formData, "frente"),
    verso: texto(formData, "verso"),
    imagem_url: texto(formData, "imagem_url"),
  });
  if ("erro" in validacao) throw new Error(`Card inválido: ${validacao.erro}.`);
  const { frente, verso, imagem_url } = validacao.card;
  await supabase
    .from("flashcards")
    .update({ frente, verso, imagem_url, status: texto(formData, "status") === "rascunho" ? "rascunho" : "publicado" })
    .eq("id", texto(formData, "id"));
  revalidar(itemId);
}

export async function excluirCard(formData: FormData) {
  const { supabase } = await exigirEquipe();
  await supabase.from("flashcards").delete().eq("id", texto(formData, "id"));
  revalidar(texto(formData, "item_id"));
}

export async function publicarRascunhos(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const itemId = texto(formData, "item_id");
  await supabase.from("flashcards").update({ status: "publicado" }).eq("item_id", itemId).eq("status", "rascunho");
  revalidar(itemId);
}

export async function importarCards(_: EstadoCards, formData: FormData): Promise<EstadoCards> {
  const { supabase } = await exigirEquipe();
  const itemId = texto(formData, "item_id");
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Envie um arquivo .csv." };
  if (arquivo.size > 2 * 1024 * 1024) return { erro: "Arquivo maior que 2 MB." };

  const { cards, erros } = importarCardsCsv(await arquivo.text());
  if (erros.length) return { erros };
  if (!cards.length) return { erro: "Nenhum card encontrado no arquivo." };

  const { data: existentes } = await supabase
    .from("flashcards")
    .select("frente")
    .eq("item_id", itemId)
    .overrideTypes<{ frente: string }[], { merge: false }>();
  const { unicos, repetidos } = removerRepetidos(cards, (existentes ?? []).map((c) => c.frente));
  if (!unicos.length) return { erro: "Todos os cards do arquivo já existem neste deck." };

  const inicio = await proximaOrdem(supabase, itemId);
  const { error } = await supabase
    .from("flashcards")
    .insert(unicos.map((c, i) => ({ ...c, item_id: itemId, ordem: inicio + i })));
  if (error) return { erro: `Não foi possível importar: ${error.message}` };

  revalidar(itemId);
  return {
    mensagem: `${unicos.length} cards importados${repetidos ? ` (${repetidos} repetidos ignorados)` : ""}.`,
  };
}
