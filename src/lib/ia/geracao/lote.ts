import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { montarBlocosMaterial, type ArquivoMaterial } from "./material";
import {
  converterQuestoesGeradas,
  INSTRUCOES_GERACAO,
  montarPedidoGeracao,
  SaidaGeracaoSchema,
  type ConfigGeracao,
  type TipoMaterial,
} from "./prompt";

// Geração roda em lote (Batch API): 50% mais barato e sem limite de tempo da
// requisição. Qualidade importa mais que na correção, por isso esforço "medium".
const MODELO_GERACAO = process.env.IA_MODELO_GERACAO || "claude-opus-5-5";
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORTS)[number];
const EFFORT_GERACAO: Effort = EFFORTS.includes(process.env.IA_EFFORT_GERACAO as Effort)
  ? (process.env.IA_EFFORT_GERACAO as Effort)
  : "medium";

const FORMATO_SAIDA = zodOutputFormat(SaidaGeracaoSchema);

export type Geracao = {
  id: string;
  disciplina_id: string;
  criado_por: string | null;
  arquivos: { caminho: string; nome: string; tipo: string; tamanho: number }[];
  texto: string;
  tipo_material: TipoMaterial;
  config: ConfigGeracao;
  status: "processando" | "importando" | "concluida" | "erro";
  batch_id: string | null;
};

let cliente: Anthropic | null = null;
function anthropic() {
  cliente ??= new Anthropic();
  return cliente;
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

  const [{ data: disciplina }, { data: existentes }] = await Promise.all([
    admin.from("disciplinas").select("nome").eq("id", geracao.disciplina_id).single<{ nome: string }>(),
    admin
      .from("questoes")
      .select("tema, enunciado")
      .eq("disciplina_id", geracao.disciplina_id)
      .order("criado_em", { ascending: false })
      .limit(150)
      .overrideTypes<{ tema: string; enunciado: string }[], { merge: false }>(),
  ]);

  const pedido = montarPedidoGeracao({
    disciplina: disciplina?.nome ?? "",
    tipoMaterial: geracao.tipo_material,
    config: geracao.config,
    temasExistentes: [...new Set((existentes ?? []).map((q) => q.tema).filter(Boolean))],
    enunciadosExistentes: (existentes ?? []).map((q) => q.enunciado.replace(/\s+/g, " ").slice(0, 160)),
  });

  const lote = await anthropic().messages.batches.create({
    requests: [
      {
        custom_id: geracao.id,
        params: {
          model: MODELO_GERACAO,
          max_tokens: 32000,
          system: INSTRUCOES_GERACAO,
          output_config: {
            effort: EFFORT_GERACAO,
            format: { type: "json_schema", schema: FORMATO_SAIDA.schema },
          },
          // Material primeiro, pedido no fim: melhor desempenho com documentos longos.
          messages: [{ role: "user", content: [...material, { type: "text", text: pedido }] }],
        },
      },
    ],
  });

  await admin
    .from("geracoes_questoes")
    .update({ batch_id: lote.id, modelo: MODELO_GERACAO })
    .eq("id", geracao.id);
}

async function falhar(geracaoId: string, mensagem: string) {
  await criarClienteAdmin()
    .from("geracoes_questoes")
    .update({ status: "erro", erro: mensagem, concluido_em: new Date().toISOString() })
    .eq("id", geracaoId);
}

/** Importa o resultado de um lote terminado. Idempotente: só uma execução "reivindica" a geração. */
async function importarResultado(geracao: Geracao) {
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
    for await (const item of await anthropic().messages.batches.results(geracao.batch_id!)) {
      if (item.custom_id !== geracao.id) continue;
      if (item.result.type !== "succeeded") {
        return falhar(geracao.id, `A IA não concluiu a geração (${item.result.type}). Tente novamente.`);
      }
      const mensagem = item.result.message;
      await admin.from("uso_ia").insert({
        usuario_id: geracao.criado_por,
        tipo: "geracao",
        modelo: mensagem.model,
        tokens_entrada: mensagem.usage.input_tokens,
        tokens_saida: mensagem.usage.output_tokens,
        tokens_cache: mensagem.usage.cache_read_input_tokens ?? 0,
      });
      if (mensagem.stop_reason === "refusal") {
        return falhar(geracao.id, "A IA recusou este material. Revise o conteúdo e tente de novo.");
      }
      if (mensagem.stop_reason === "max_tokens") {
        return falhar(geracao.id, "A resposta ficou longa demais. Peça menos questões por geração.");
      }

      const texto = mensagem.content.find((b) => b.type === "text");
      const saida = texto?.type === "text" ? FORMATO_SAIDA.parse(texto.text) : null;
      if (!saida) return falhar(geracao.id, "Resposta da IA em formato inválido. Tente novamente.");

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
        if (error) return falhar(geracao.id, `Erro ao salvar as questões: ${error.message}`);
      }

      await admin
        .from("geracoes_questoes")
        .update({
          status: "concluida",
          questoes_geradas: questoes.length,
          questoes_descartadas: descartadas.length,
          observacoes: saida.observacoes.trim() || null,
          concluido_em: new Date().toISOString(),
        })
        .eq("id", geracao.id);
      return;
    }
    return falhar(geracao.id, "Resultado da geração não encontrado.");
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
        const lote = await anthropic().messages.batches.retrieve(geracao.batch_id!);
        if (lote.processing_status === "ended") await importarResultado(geracao);
      } catch (erro) {
        console.error("Falha ao consultar lote", { geracaoId: geracao.id, erro });
      }
    }),
  );
}
