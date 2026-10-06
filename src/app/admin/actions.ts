"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirEquipe } from "@/lib/auth";
import { localParaIso } from "@/lib/datas";
import { gerarSlug } from "@/lib/slug";
import type { ConfigItem, StatusDisciplina, StatusPublicacao, TipoItem } from "@/lib/tipos";

const STATUS_DISCIPLINA: StatusDisciplina[] = ["rascunho", "em_breve", "publicada", "arquivada"];
const STATUS_PUBLICACAO: StatusPublicacao[] = ["rascunho", "publicado"];
const TIPOS_ITEM: TipoItem[] = ["video", "resumo", "mapa_mental", "flashcards", "prova"];

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

/** Capa: URL externa ou arquivo do próprio site (ex.: /capas/cirurgia.png). */
function capaOuNull(formData: FormData) {
  const valor = texto(formData, "capa_url");
  if (/^\/[^/\\]/.test(valor)) return valor;
  return urlOuUndefined(formData, "capa_url") ?? null;
}

function numeroOuNull(formData: FormData, campo: string) {
  const valor = texto(formData, campo);
  if (!valor) return null;
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function urlOuUndefined(formData: FormData, campo: string) {
  const valor = texto(formData, campo);
  if (!valor) return undefined;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function escolher<T extends string>(valor: string, opcoes: T[], padrao: T): T {
  return (opcoes as string[]).includes(valor) ? (valor as T) : padrao;
}

function falhar(mensagem: string, erro: { message: string } | null): never {
  throw new Error(erro ? `${mensagem}: ${erro.message}` : mensagem);
}

// --- Disciplinas --------------------------------------------------------------

export async function criarDisciplina(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const nome = texto(formData, "nome");
  if (!nome) return;

  const { data: ultima } = await supabase
    .from("disciplinas")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle<{ ordem: number }>();

  const { data, error } = await supabase
    .from("disciplinas")
    .insert({ nome, slug: gerarSlug(nome), ordem: (ultima?.ordem ?? 0) + 1 })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) falhar("Não foi possível criar a disciplina (o nome já existe?)", error);

  redirect(`/admin/disciplinas/${data.id}`);
}

export async function salvarDisciplina(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const id = texto(formData, "id");

  const { error } = await supabase
    .from("disciplinas")
    .update({
      nome: texto(formData, "nome"),
      slug: gerarSlug(texto(formData, "slug") || texto(formData, "nome")),
      descricao: texto(formData, "descricao"),
      capa_url: capaOuNull(formData),
      periodo_sugerido: numeroOuNull(formData, "periodo_sugerido"),
      carga_horaria_h: numeroOuNull(formData, "carga_horaria_h") ?? 0,
      status: escolher(texto(formData, "status"), STATUS_DISCIPLINA, "rascunho"),
      publicar_em: localParaIso(formData.get("publicar_em")),
    })
    .eq("id", id);
  if (error) falhar("Não foi possível salvar a disciplina", error);

  revalidatePath("/admin", "layout");
  revalidatePath("/aluno", "layout");
}

export async function excluirDisciplina(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const { error } = await supabase.from("disciplinas").delete().eq("id", texto(formData, "id"));
  if (error) falhar("Não foi possível excluir (há certificados emitidos? arquive em vez de excluir)", error);
  revalidatePath("/admin", "layout");
  redirect("/admin");
}

// --- Módulos ------------------------------------------------------------------

export async function criarModulo(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const disciplinaId = texto(formData, "disciplina_id");
  const titulo = texto(formData, "titulo");
  if (!titulo) return;

  const { data: ultimo } = await supabase
    .from("modulos")
    .select("ordem")
    .eq("disciplina_id", disciplinaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle<{ ordem: number }>();

  const { error } = await supabase
    .from("modulos")
    .insert({ disciplina_id: disciplinaId, titulo, ordem: (ultimo?.ordem ?? 0) + 1 });
  if (error) falhar("Não foi possível criar o módulo", error);
  revalidatePath(`/admin/disciplinas/${disciplinaId}`);
}

export async function salvarModulo(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const { error } = await supabase
    .from("modulos")
    .update({
      titulo: texto(formData, "titulo"),
      status: escolher(texto(formData, "status"), STATUS_PUBLICACAO, "rascunho"),
    })
    .eq("id", texto(formData, "id"));
  if (error) falhar("Não foi possível salvar o módulo", error);
  revalidatePath("/admin", "layout");
  revalidatePath("/aluno", "layout");
}

export async function excluirModulo(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const { error } = await supabase.from("modulos").delete().eq("id", texto(formData, "id"));
  if (error) falhar("Não foi possível excluir o módulo", error);
  revalidatePath("/admin", "layout");
}

// --- Itens --------------------------------------------------------------------

export async function criarItem(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const moduloId = texto(formData, "modulo_id");
  const titulo = texto(formData, "titulo");
  if (!titulo) return;

  const { data: ultimo } = await supabase
    .from("itens")
    .select("ordem")
    .eq("modulo_id", moduloId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle<{ ordem: number }>();

  const { error } = await supabase.from("itens").insert({
    modulo_id: moduloId,
    titulo,
    tipo: escolher(texto(formData, "tipo"), TIPOS_ITEM, "video"),
    obrigatorio: formData.get("obrigatorio") === "on",
    ordem: (ultimo?.ordem ?? 0) + 1,
  });
  if (error) falhar("Não foi possível criar o item", error);
  revalidatePath("/admin", "layout");
}

export async function salvarItem(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const id = texto(formData, "id");

  // O resumo importado dos PDFs (scripts/resumos) não tem campo no formulário:
  // mantém o que já está gravado em vez de apagar ao salvar.
  const { data: atual, error: erroAtual } = await supabase.rpc("conteudo_item", { p_item_id: id });
  if (erroAtual) falhar("Não foi possível ler o item", erroAtual);
  const { resumo, pdf_caminho, pdf_pagina } = (atual ?? {}) as ConfigItem;

  const config: ConfigItem = {
    resumo,
    pdf_caminho,
    pdf_pagina,
    video_url: urlOuUndefined(formData, "video_url"),
    duracao_min: numeroOuNull(formData, "duracao_min") ?? undefined,
    conteudo: texto(formData, "conteudo") || undefined,
    pdf_url: urlOuUndefined(formData, "pdf_url"),
    imagem_url: urlOuUndefined(formData, "imagem_url"),
    nota_minima: numeroOuNull(formData, "nota_minima") ?? undefined,
  };

  const { error } = await supabase
    .from("itens")
    .update({
      titulo: texto(formData, "titulo"),
      obrigatorio: formData.get("obrigatorio") === "on",
      status: escolher(texto(formData, "status"), STATUS_PUBLICACAO, "rascunho"),
      publicar_em: localParaIso(formData.get("publicar_em")),
      config: JSON.parse(JSON.stringify(config)),
    })
    .eq("id", id);
  if (error) falhar("Não foi possível salvar o item", error);

  revalidatePath("/admin", "layout");
  revalidatePath("/aluno", "layout");
}

/** Liga/desliga um campo booleano ou alterna rascunho/publicado direto da lista. */
export async function alternarItem(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const campo = texto(formData, "campo");
  const valor = texto(formData, "valor");
  const alteracao =
    campo === "obrigatorio"
      ? { obrigatorio: valor === "true" }
      : { status: escolher(valor, STATUS_PUBLICACAO, "rascunho") };

  const { error } = await supabase.from("itens").update(alteracao).eq("id", texto(formData, "id"));
  if (error) falhar("Não foi possível atualizar o item", error);
  revalidatePath("/admin", "layout");
  revalidatePath("/aluno", "layout");
}

export async function excluirItem(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const { error } = await supabase.from("itens").delete().eq("id", texto(formData, "id"));
  if (error) falhar("Não foi possível excluir o item", error);
  revalidatePath("/admin", "layout");
}

// --- Ordenação ----------------------------------------------------------------

/** Sobe/desce um módulo ou item trocando a ordem com o vizinho. */
export async function mover(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const tabela = texto(formData, "tabela") === "modulos" ? "modulos" : "itens";
  const campoPai = tabela === "modulos" ? "disciplina_id" : "modulo_id";
  const id = texto(formData, "id");
  const paraCima = texto(formData, "direcao") === "cima";

  const { data: atual } = await supabase
    .from(tabela)
    .select(`id, ordem, ${campoPai}`)
    .eq("id", id)
    .single<Record<string, string | number>>();
  if (!atual) return;

  const { data: vizinho } = await supabase
    .from(tabela)
    .select("id, ordem")
    .eq(campoPai, atual[campoPai])
    .filter("ordem", paraCima ? "lt" : "gt", atual.ordem)
    .order("ordem", { ascending: !paraCima })
    .limit(1)
    .maybeSingle<{ id: string; ordem: number }>();
  if (!vizinho) return;

  await supabase.from(tabela).update({ ordem: vizinho.ordem }).eq("id", atual.id);
  await supabase.from(tabela).update({ ordem: atual.ordem }).eq("id", vizinho.id);
  revalidatePath("/admin", "layout");
  revalidatePath("/aluno", "layout");
}
