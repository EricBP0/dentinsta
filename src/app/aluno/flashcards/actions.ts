"use server";

import { revalidatePath } from "next/cache";
import { exigirLogin } from "@/lib/auth";
import { dataProximaRevisao, proximoEstado, type Avaliacao, type EstadoCard } from "@/lib/flashcards/repeticao";
import { carregarResumo, paraEstado } from "@/lib/flashcards/sessao";

const AVALIACOES: Avaliacao[] = ["errei", "dificil", "bom", "facil"];

export async function registrarRevisao(
  flashcardId: string,
  avaliacao: Avaliacao,
): Promise<{ estado: EstadoCard; deckConcluido: boolean } | { erro: string }> {
  const { supabase, perfil } = await exigirLogin();
  if (!AVALIACOES.includes(avaliacao)) return { erro: "Avaliação inválida." };

  // O RLS só devolve o card se o aluno tiver acesso ao deck.
  const { data: card } = await supabase
    .from("flashcards")
    .select("id, item_id")
    .eq("id", flashcardId)
    .maybeSingle<{ id: string; item_id: string }>();
  if (!card) return { erro: "Card não encontrado." };

  const { data: atual } = await supabase
    .from("flashcard_revisoes")
    .select("flashcard_id, facilidade, intervalo_dias, repeticoes, lapsos")
    .eq("usuario_id", perfil.id)
    .eq("flashcard_id", flashcardId)
    .maybeSingle();

  const agora = new Date();
  const estado = proximoEstado(paraEstado(atual), avaliacao);
  const { error } = await supabase.from("flashcard_revisoes").upsert({
    usuario_id: perfil.id,
    flashcard_id: flashcardId,
    facilidade: estado.facilidade,
    intervalo_dias: estado.intervaloDias,
    repeticoes: estado.repeticoes,
    lapsos: estado.lapsos,
    proxima_revisao: dataProximaRevisao(estado, agora).toISOString(),
    ultima_revisao: agora.toISOString(),
  });
  if (error) return { erro: "Não foi possível salvar a revisão." };

  // Deck concluído (para o certificado): todos os cards publicados vistos pelo menos 1 vez.
  let deckConcluido = false;
  if (!atual) {
    const [resumo] = await carregarResumo(supabase, card.item_id);
    if (resumo && resumo.total > 0 && resumo.vistos >= resumo.total) {
      deckConcluido = true;
      await supabase.from("progresso_item").upsert({
        usuario_id: perfil.id,
        item_id: card.item_id,
        concluido: true,
        percentual: 100,
        concluido_em: agora.toISOString(),
        atualizado_em: agora.toISOString(),
      });
      revalidatePath("/aluno", "layout");
    }
  }
  return { estado, deckConcluido };
}
