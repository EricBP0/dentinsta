"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirEquipe } from "@/lib/auth";
import { importarQuestoesCsv } from "@/lib/questoes/csv";
import { LETRAS, validarQuestao, type QuestaoNova } from "@/lib/questoes/questao";

export type EstadoQuestao = { erro?: string };
export type EstadoImportacao = {
  erro?: string;
  importadas?: number;
  erros?: { linha: number; mensagem: string }[];
};

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "");
}

function paraBanco(questao: QuestaoNova, disciplinaId: string, status: string) {
  return {
    ...questao,
    disciplina_id: disciplinaId,
    status: status === "aprovada" ? "aprovada" : "rascunho",
  };
}

export async function salvarQuestao(_: EstadoQuestao, formData: FormData): Promise<EstadoQuestao> {
  const { supabase } = await exigirEquipe();
  const id = texto(formData, "id");
  const disciplinaId = texto(formData, "disciplina_id");
  if (!disciplinaId) return { erro: "Escolha a disciplina." };

  const validacao = validarQuestao({
    tipo: texto(formData, "tipo"),
    tema: texto(formData, "tema"),
    dificuldade: texto(formData, "dificuldade"),
    enunciado: texto(formData, "enunciado"),
    alternativas: LETRAS.map((l) => texto(formData, `alternativa_${l}`)),
    gabarito: texto(formData, "gabarito"),
    explicacao: texto(formData, "explicacao"),
    rubrica: texto(formData, "rubrica"),
    estilo: texto(formData, "estilo"),
  });
  if ("erro" in validacao) return { erro: validacao.erro };

  const dados = paraBanco(validacao.questao, disciplinaId, texto(formData, "status"));
  const { error } = id
    ? await supabase.from("questoes").update(dados).eq("id", id)
    : await supabase.from("questoes").insert(dados);
  if (error) return { erro: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/admin/questoes");
  redirect(`/admin/questoes?disciplina=${disciplinaId}`);
}

export async function alternarStatusQuestao(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const status = texto(formData, "status") === "aprovada" ? "aprovada" : "rascunho";
  await supabase.from("questoes").update({ status }).eq("id", texto(formData, "id"));
  revalidatePath("/admin/questoes");
}

export async function excluirQuestao(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const { error } = await supabase.from("questoes").delete().eq("id", texto(formData, "id"));
  if (error) throw new Error(`Não foi possível excluir: ${error.message}`);
  revalidatePath("/admin/questoes");
}

export async function importarQuestoes(_: EstadoImportacao, formData: FormData): Promise<EstadoImportacao> {
  const { supabase } = await exigirEquipe();
  const disciplinaId = texto(formData, "disciplina_id");
  const arquivo = formData.get("arquivo");
  if (!disciplinaId) return { erro: "Escolha a disciplina." };
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Envie um arquivo .csv." };
  if (arquivo.size > 5 * 1024 * 1024) return { erro: "Arquivo maior que 5 MB." };

  const { questoes, erros } = importarQuestoesCsv(await arquivo.text());
  // Tudo ou nada: se alguma linha tem erro, nada é importado.
  if (erros.length) return { erros };
  if (!questoes.length) return { erro: "Nenhuma questão encontrada no arquivo." };

  const status = texto(formData, "status");
  const { error } = await supabase.from("questoes").insert(questoes.map((q) => paraBanco(q, disciplinaId, status)));
  if (error) return { erro: `Não foi possível importar: ${error.message}` };

  revalidatePath("/admin/questoes");
  return { importadas: questoes.length };
}
