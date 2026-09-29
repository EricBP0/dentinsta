import type { SupabaseClient } from "@supabase/supabase-js";
import { ESTADO_INICIAL, type EstadoCard } from "./repeticao";

export const NOVOS_POR_SESSAO = 20;

export type CardSessao = {
  id: string;
  item_id: string;
  frente: string;
  verso: string;
  imagem_url: string | null;
  novo: boolean;
  estado: EstadoCard;
};

type LinhaRevisao = {
  flashcard_id: string;
  facilidade: number;
  intervalo_dias: number;
  repeticoes: number;
  lapsos: number;
};

export function paraEstado(linha: LinhaRevisao | null | undefined): EstadoCard {
  if (!linha) return ESTADO_INICIAL;
  return {
    facilidade: Number(linha.facilidade),
    intervaloDias: linha.intervalo_dias,
    repeticoes: linha.repeticoes,
    lapsos: linha.lapsos,
  };
}

/** Cards para estudar agora (vencidos + novos), com o estado de cada um para os botões. */
export async function carregarSessao(
  supabase: SupabaseClient,
  usuarioId: string,
  itemId: string | null,
): Promise<CardSessao[]> {
  const { data } = await supabase.rpc("flashcards_para_estudar", {
    p_item_id: itemId,
    p_limite_novos: NOVOS_POR_SESSAO,
  });
  const cards = (data ?? []) as Omit<CardSessao, "estado">[];
  const vencidos = cards.filter((c) => !c.novo).map((c) => c.id);

  const { data: revisoes } = vencidos.length
    ? await supabase
        .from("flashcard_revisoes")
        .select("flashcard_id, facilidade, intervalo_dias, repeticoes, lapsos")
        .eq("usuario_id", usuarioId)
        .in("flashcard_id", vencidos)
        .overrideTypes<LinhaRevisao[], { merge: false }>()
    : { data: [] as LinhaRevisao[] };
  const porCard = new Map((revisoes ?? []).map((r) => [r.flashcard_id, r]));

  return cards.map((c) => ({ ...c, estado: paraEstado(porCard.get(c.id)) }));
}

export type ResumoDeck = { item_id: string; total: number; vistos: number; vencidos: number };

export async function carregarResumo(supabase: SupabaseClient, itemId: string | null = null): Promise<ResumoDeck[]> {
  const { data } = await supabase.rpc("resumo_flashcards", { p_item_id: itemId });
  return ((data ?? []) as ResumoDeck[]).map((r) => ({
    item_id: r.item_id,
    total: Number(r.total),
    vistos: Number(r.vistos),
    vencidos: Number(r.vencidos),
  }));
}
