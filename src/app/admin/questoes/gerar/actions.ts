"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { exigirEquipe } from "@/lib/auth";
import { enviarLoteGeracao, sincronizarGeracoes, type Geracao } from "@/lib/ia/geracao/lote";
import { validarArquivos } from "@/lib/ia/geracao/material";
import { MAX_CARDS_POR_GERACAO, MAX_QUESTOES_POR_GERACAO } from "@/lib/ia/geracao/prompt";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export type PedidoGeracao = {
  /** "flashcards": gera cards para o deck `itemId`. Padrão: questões. */
  alvo?: "questoes" | "flashcards";
  itemId?: string;
  cards?: number;
  disciplinaId: string;
  tipoMaterial: "conteudo" | "prova";
  arquivos: { caminho: string; nome: string; tipo: string; tamanho: number }[];
  texto: string;
  objetivas: number;
  discursivas: number;
  dificuldade: number | null;
  tema: string;
  instrucoes: string;
};

function inteiroEntre(valor: number, min: number, max: number) {
  return Number.isInteger(valor) && valor >= min && valor <= max;
}

export async function criarGeracao(pedido: PedidoGeracao): Promise<{ erro?: string; id?: string }> {
  const { supabase, perfil } = await exigirEquipe();

  const flashcards = pedido.alvo === "flashcards";
  if (flashcards) {
    // A disciplina vem do deck, não do formulário.
    const { data: deck } = await supabase
      .from("itens")
      .select("tipo, modulos(disciplina_id)")
      .eq("id", pedido.itemId ?? "")
      .maybeSingle<{ tipo: string; modulos: { disciplina_id: string } }>();
    if (!deck || deck.tipo !== "flashcards") return { erro: "Deck de flashcards não encontrado." };
    pedido.disciplinaId = deck.modulos.disciplina_id;
  }
  if (!pedido.disciplinaId) return { erro: "Escolha a disciplina." };
  if (!pedido.arquivos.length && !pedido.texto.trim()) return { erro: "Envie um arquivo ou cole um texto." };
  if (pedido.arquivos.some((a) => !a.caminho.startsWith("geracoes/") || a.caminho.includes(".."))) {
    return { erro: "Arquivo inválido." };
  }
  const erroArquivos = validarArquivos(pedido.arquivos);
  if (erroArquivos) return { erro: erroArquivos };
  if (flashcards) {
    if (!inteiroEntre(pedido.cards ?? 0, 1, MAX_CARDS_POR_GERACAO)) {
      return { erro: `Peça entre 1 e ${MAX_CARDS_POR_GERACAO} cards por geração.` };
    }
  } else {
    if (!inteiroEntre(pedido.objetivas, 0, MAX_QUESTOES_POR_GERACAO) || !inteiroEntre(pedido.discursivas, 0, 10)) {
      return { erro: "Quantidade de questões inválida." };
    }
    const total = pedido.objetivas + pedido.discursivas;
    if (total < 1 || total > MAX_QUESTOES_POR_GERACAO) {
      return { erro: `Peça entre 1 e ${MAX_QUESTOES_POR_GERACAO} questões por geração.` };
    }
  }

  const { data: geracao, error } = await supabase
    .from("geracoes_questoes")
    .insert({
      disciplina_id: pedido.disciplinaId,
      alvo: flashcards ? "flashcards" : "questoes",
      item_id: flashcards ? pedido.itemId : null,
      criado_por: perfil.id,
      arquivos: pedido.arquivos,
      texto: pedido.texto.slice(0, 200_000),
      tipo_material: pedido.tipoMaterial === "prova" ? "prova" : "conteudo",
      config: {
        objetivas: flashcards ? 0 : pedido.objetivas,
        discursivas: flashcards ? 0 : pedido.discursivas,
        ...(flashcards && { cards: pedido.cards }),
        dificuldade: [1, 2, 3].includes(pedido.dificuldade ?? 0) ? pedido.dificuldade : null,
        tema: pedido.tema.trim().slice(0, 100),
        instrucoes: pedido.instrucoes.trim().slice(0, 2000),
      },
    })
    .select("*")
    .single<Geracao>();
  if (error || !geracao) return { erro: "Não foi possível registrar a geração." };

  // Montar o lote (baixar e converter o material) pode levar alguns segundos.
  after(async () => {
    try {
      await enviarLoteGeracao(geracao);
    } catch (erro) {
      console.error("Falha ao enviar lote de geração", { geracaoId: geracao.id, erro });
      await criarClienteAdmin()
        .from("geracoes_questoes")
        .update({
          status: "erro",
          erro: erro instanceof Error ? erro.message : "Falha ao enviar o material para a IA.",
          concluido_em: new Date().toISOString(),
        })
        .eq("id", geracao.id);
    }
  });

  revalidatePath("/admin/questoes/geracoes");
  return { id: geracao.id };
}

export async function verificarGeracoes() {
  await exigirEquipe();
  await sincronizarGeracoes();
  revalidatePath("/admin/questoes/geracoes");
}

export async function aprovarTodasDaGeracao(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const geracaoId = String(formData.get("geracao_id"));
  if (formData.get("alvo") === "flashcards") {
    await supabase.from("flashcards").update({ status: "publicado" }).eq("geracao_id", geracaoId).eq("status", "rascunho");
    revalidatePath("/admin", "layout");
    revalidatePath("/aluno", "layout");
    return;
  }
  await supabase.from("questoes").update({ status: "aprovada" }).eq("geracao_id", geracaoId).eq("status", "rascunho");
  revalidatePath("/admin/questoes", "layout");
}
