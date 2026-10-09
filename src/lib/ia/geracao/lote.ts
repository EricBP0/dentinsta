import "server-only";
import type { z } from "zod";
import { removerRepetidos, validarCard, type CardNovo } from "@/lib/flashcards/cards";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { consultarLote, enviarLote } from "../provedores";
import type { EstadoLote } from "../provedores/tipos";
import { montarBlocosMaterial, type ArquivoMaterial } from "./material";
import {
  converterQuestoesGeradas,
  INSTRUCOES_FLASHCARDS,
  INSTRUCOES_GERACAO,
  montarPedidoFlashcards,
  montarPedidoGeracao,
  SaidaFlashcardsSchema,
  SaidaGeracaoSchema,
  type ConfigGeracao,
  type TipoMaterial,
} from "./prompt";

// Geração roda em lote: 50% mais barato e sem limite de tempo da requisição.
// Os modelos (e a ordem de reserva) vêm de IA_GERACAO; o esforço, de
// IA_EFFORT_GERACAO (padrão "medium": qualidade importa mais que na correção).

export type Geracao = {
  id: string;
  disciplina_id: string;
  criado_por: string | null;
  alvo: "questoes" | "flashcards";
  item_id: string | null;
  arquivos: { caminho: string; nome: string; tipo: string; tamanho: number }[];
  texto: string;
  tipo_material: TipoMaterial;
  config: ConfigGeracao;
  status: "processando" | "importando" | "concluida" | "erro";
  batch_id: string | null;
};

async function montarPedido(geracao: Geracao) {
  const admin = criarClienteAdmin();
  const { data: disciplina } = await admin
    .from("disciplinas")
    .select("nome")
    .eq("id", geracao.disciplina_id)
    .single<{ nome: string }>();

  if (geracao.alvo === "flashcards") {
    const [{ data: deck }, { data: existentes }] = await Promise.all([
      admin.from("itens").select("titulo").eq("id", geracao.item_id!).single<{ titulo: string }>(),
      admin
        .from("flashcards")
        .select("frente")
        .eq("item_id", geracao.item_id!)
        .limit(300)
        .overrideTypes<{ frente: string }[], { merge: false }>(),
    ]);
    return {
      sistema: INSTRUCOES_FLASHCARDS,
      schema: SaidaFlashcardsSchema as z.ZodType,
      pedido: montarPedidoFlashcards({
        disciplina: disciplina?.nome ?? "",
        deck: deck?.titulo ?? "",
        tipoMaterial: geracao.tipo_material,
        config: geracao.config,
        frentesExistentes: (existentes ?? []).map((c) => c.frente.replace(/\s+/g, " ").slice(0, 160)),
      }),
    };
  }

  const { data: existentes } = await admin
    .from("questoes")
    .select("tema, enunciado")
    .eq("disciplina_id", geracao.disciplina_id)
    .order("criado_em", { ascending: false })
    .limit(150)
    .overrideTypes<{ tema: string; enunciado: string }[], { merge: false }>();
  return {
    sistema: INSTRUCOES_GERACAO,
    schema: SaidaGeracaoSchema as z.ZodType,
    pedido: montarPedidoGeracao({
      disciplina: disciplina?.nome ?? "",
      tipoMaterial: geracao.tipo_material,
      config: geracao.config,
      temasExistentes: [...new Set((existentes ?? []).map((q) => q.tema).filter(Boolean))],
      enunciadosExistentes: (existentes ?? []).map((q) => q.enunciado.replace(/\s+/g, " ").slice(0, 160)),
    }),
  };
}

/** Baixa o material, monta o pedido e envia o lote. Grava o batch_id na geração. */
export async function enviarLoteGeracao(geracao: Geracao) {
  const admin = criarClienteAdmin();

  const arquivos: ArquivoMaterial[] = [];
  for (const a of geracao.arquivos) {
    const { data, error } = await admin.storage.from("materiais").download(a.caminho);
    if (error || !data) throw new Error(`Não foi possível ler o arquivo ${a.nome}`);
    arquivos.push({ nome: a.nome, tipo: a.tipo, dados: Buffer.from(await data.arrayBuffer()) });
  }
  const material = await montarBlocosMaterial(arquivos, geracao.texto);
  if (!material.length) throw new Error("O material enviado está vazio.");

  const { sistema, schema, pedido } = await montarPedido(geracao);
  // Material primeiro, pedido no fim: melhor desempenho com documentos longos.
  const { idLote, modelo } = await enviarLote(
    "geracao",
    { sistema, schema, partes: [...material, { tipo: "texto", texto: pedido }], maxTokens: 32000 },
    geracao.id,
  );

  await admin.from("geracoes_questoes").update({ batch_id: idLote, modelo }).eq("id", geracao.id);
}

async function falhar(geracaoId: string, mensagem: string) {
  await criarClienteAdmin()
    .from("geracoes_questoes")
    .update({ status: "erro", erro: mensagem, concluido_em: new Date().toISOString() })
    .eq("id", geracaoId);
}

/** Salva o que a IA gerou como rascunho. Retorna quantos entraram e quantos foram descartados. */
async function salvarResultado(geracao: Geracao, texto: string) {
  const admin = criarClienteAdmin();

  if (geracao.alvo === "flashcards") {
    const saida = SaidaFlashcardsSchema.parse(JSON.parse(texto));
    const validos: CardNovo[] = [];
    let descartados = 0;
    for (const c of saida.cards) {
      const validacao = validarCard(c);
      if ("erro" in validacao) descartados++;
      else validos.push(validacao.card);
    }
    const { data: existentes } = await admin
      .from("flashcards")
      .select("frente, ordem")
      .eq("item_id", geracao.item_id!)
      .order("ordem", { ascending: false })
      .overrideTypes<{ frente: string; ordem: number }[], { merge: false }>();
    const { unicos, repetidos } = removerRepetidos(validos, (existentes ?? []).map((c) => c.frente));
    const ultimaOrdem = existentes?.[0]?.ordem ?? 0;

    if (unicos.length) {
      const { error } = await admin.from("flashcards").insert(
        unicos.map((c, i) => ({
          ...c,
          item_id: geracao.item_id,
          ordem: ultimaOrdem + i + 1,
          status: "rascunho",
          origem: "ia",
          geracao_id: geracao.id,
        })),
      );
      if (error) throw new Error(`Erro ao salvar os flashcards: ${error.message}`);
    }
    return { gerados: unicos.length, descartados: descartados + repetidos, observacoes: saida.observacoes };
  }

  const saida = SaidaGeracaoSchema.parse(JSON.parse(texto));
  const { questoes, descartadas } = converterQuestoesGeradas(saida.questoes);
  if (questoes.length) {
    const { error } = await admin.from("questoes").insert(
      questoes.map((q) => ({
        ...q,
        disciplina_id: geracao.disciplina_id,
        status: "rascunho",
        origem: "ia",
        geracao_id: geracao.id,
      })),
    );
    if (error) throw new Error(`Erro ao salvar as questões: ${error.message}`);
  }
  return { gerados: questoes.length, descartados: descartadas.length, observacoes: saida.observacoes };
}

/** Importa o resultado de um lote terminado. Idempotente: só uma execução "reivindica" a geração. */
async function importarResultado(geracao: Geracao, estado: Extract<EstadoLote, { terminado: true }>) {
  const admin = criarClienteAdmin();
  const { data: reivindicada } = await admin
    .from("geracoes_questoes")
    .update({ status: "importando" })
    .eq("id", geracao.id)
    .eq("status", "processando")
    .select("id")
    .maybeSingle();
  if (!reivindicada) return;

  try {
    if (estado.uso) {
      await admin.from("uso_ia").insert({
        usuario_id: geracao.criado_por,
        tipo: geracao.alvo === "flashcards" ? "geracao_flashcards" : "geracao",
        modelo: estado.modelo ?? "",
        tokens_entrada: estado.uso.entrada,
        tokens_saida: estado.uso.saida,
        tokens_cache: estado.uso.cache,
      });
    }
    if ("erro" in estado) return falhar(geracao.id, estado.erro);

    const { gerados, descartados, observacoes } = await salvarResultado(geracao, estado.texto);
    await admin
      .from("geracoes_questoes")
      .update({
        status: "concluida",
        questoes_geradas: gerados,
        questoes_descartadas: descartados,
        observacoes: observacoes.trim() || null,
        concluido_em: new Date().toISOString(),
      })
      .eq("id", geracao.id);
  } catch (erro) {
    console.error("Falha ao importar geração", { geracaoId: geracao.id, erro });
    return falhar(geracao.id, "Falha ao importar o resultado. Tente gerar novamente.");
  }
}

/** Confere os lotes em andamento e importa os que terminaram. */
export async function sincronizarGeracoes() {
  const admin = criarClienteAdmin();
  const { data: pendentes } = await admin
    .from("geracoes_questoes")
    .select("*")
    .eq("status", "processando")
    .not("batch_id", "is", null)
    .overrideTypes<Geracao[], { merge: false }>();

  await Promise.all(
    (pendentes ?? []).map(async (geracao) => {
      try {
        const estado = await consultarLote(geracao.batch_id!, geracao.id);
        if (estado.terminado) await importarResultado(geracao, estado);
      } catch (erro) {
        console.error("Falha ao consultar lote", { geracaoId: geracao.id, erro });
      }
    }),
  );
}
