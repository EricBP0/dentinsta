import "server-only";
import {
  FinishReason,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  JobState,
  ThinkingLevel,
  type Content,
  type GenerateContentConfig,
  type GenerateContentResponse,
  type Part,
} from "@google/genai";
import type { z } from "zod";
import { schemaParaGemini } from "./esquema";
import { RecusaIA, type Esforco, type EstadoLote, type Fluxo, type Parte, type Provedor, type Uso } from "./tipos";

// Provedor Google Gemini (API do Google AI Studio, chave GEMINI_API_KEY).
// Use a conta paga: na gratuita o Google usa o conteúdo para treinar modelos.
// GEMINI_BASE_URL aponta para outro endereço (testes automatizados).

let cliente: GoogleGenAI | null = null;
function gemini() {
  cliente ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    ...(process.env.GEMINI_BASE_URL && { httpOptions: { baseUrl: process.env.GEMINI_BASE_URL } }),
  });
  return cliente;
}

const NIVEL: Record<Esforco, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
  xhigh: ThinkingLevel.HIGH,
  max: ThinkingLevel.HIGH,
};

// Odontologia fala de anatomia, doenças, cirurgias e medicamentos: os filtros só
// bloqueiam o que for de alto risco, senão perguntas normais de aula seriam barradas.
const SEGURANCA = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }));

// Fim de resposta que significa "não respondeu por política": vale tentar outro modelo.
const BLOQUEIOS = new Set<FinishReason | undefined>([
  FinishReason.SAFETY,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.BLOCKLIST,
  FinishReason.SPII,
  FinishReason.RECITATION,
  FinishReason.IMAGE_SAFETY,
]);

// Pedidos em lote enviados direto (sem upload de arquivo) vão até 20 MB.
const LIMITE_LOTE_BYTES = 19 * 1024 * 1024;

function partes(lista: Parte[]): Part[] {
  return lista.flatMap((p): Part[] => {
    if (p.tipo === "texto") return [{ text: p.titulo ? `### ${p.titulo}\n${p.texto}` : p.texto }];
    const mimeType = p.tipo === "pdf" ? "application/pdf" : p.mime;
    return [{ text: `Arquivo do material: ${p.nome}` }, { inlineData: { mimeType, data: p.dados.toString("base64") } }];
  });
}

function configuracao(
  sistema: string,
  esforco: Esforco | null,
  maxTokens: number,
  schema?: z.ZodType,
): GenerateContentConfig {
  return {
    systemInstruction: sistema,
    maxOutputTokens: maxTokens,
    ...(esforco && { thinkingConfig: { thinkingLevel: NIVEL[esforco] } }),
    safetySettings: SEGURANCA,
    ...(schema && { responseMimeType: "application/json", responseJsonSchema: schemaParaGemini(schema) }),
  };
}

function usoDa(resposta?: GenerateContentResponse): Uso {
  const m = resposta?.usageMetadata;
  return {
    entrada: m?.promptTokenCount ?? 0,
    // O raciocínio ("thinking") é cobrado como saída.
    saida: (m?.candidatesTokenCount ?? 0) + (m?.thoughtsTokenCount ?? 0),
    cache: m?.cachedContentTokenCount ?? 0,
  };
}

/** Texto da resposta, ou erro: RecusaIA para bloqueios, Error para o resto. */
function textoDa(resposta: GenerateContentResponse | undefined): string {
  if (!resposta) throw new Error("Gemini sem resposta");
  if (resposta.promptFeedback?.blockReason) {
    throw new RecusaIA(`Gemini bloqueou o pedido (${resposta.promptFeedback.blockReason})`);
  }
  const candidato = resposta.candidates?.[0];
  if (BLOQUEIOS.has(candidato?.finishReason)) throw new RecusaIA(`Gemini bloqueou a resposta (${candidato?.finishReason})`);
  if (candidato?.finishReason === FinishReason.MAX_TOKENS) throw new Error("Resposta do Gemini cortada (limite de tokens)");
  const texto = textoDasPartes(resposta);
  if (!texto) throw new Error(`Gemini respondeu vazio (${candidato?.finishReason ?? "sem motivo"})`);
  return texto;
}

/**
 * Texto do primeiro candidato, sem as partes de raciocínio. Lido das partes (e
 * não de `.text`) porque as respostas de lote chegam como objeto simples.
 */
function textoDasPartes(resposta: GenerateContentResponse | undefined): string {
  return (resposta?.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => typeof p.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("");
}

export const provedorGemini: Provedor = {
  nome: "gemini",
  disponivel: () => Boolean(process.env.GEMINI_API_KEY),

  async gerarEstruturado(modelo, pedido) {
    const resposta = await gemini().models.generateContent({
      model: modelo,
      contents: [{ role: "user", parts: partes(pedido.partes) }],
      config: configuracao(pedido.sistema, pedido.esforco, pedido.maxTokens, pedido.schema),
    });
    const dados = pedido.schema.parse(JSON.parse(textoDa(resposta)));
    return { dados, modelo: resposta.modelVersion ?? modelo, uso: usoDa(resposta) };
  },

  conversar(modelo, { sistema, historico, esforco, maxTokens }): Fluxo {
    let resolver!: (resultado: Awaited<Fluxo["fim"]>) => void;
    let rejeitar!: (e: unknown) => void;
    const fim = new Promise<Awaited<Fluxo["fim"]>>((ok, erro) => {
      resolver = ok;
      rejeitar = erro;
    });
    fim.catch(() => {});
    const contents: Content[] = historico.map((m) => ({
      role: m.papel === "assistant" ? "model" : "user",
      parts: [{ text: m.conteudo }],
    }));

    async function* pedacos() {
      let ultimo: GenerateContentResponse | undefined;
      let recusado = false;
      try {
        const fluxo = await gemini().models.generateContentStream({
          model: modelo,
          contents,
          config: configuracao(sistema, esforco, maxTokens),
        });
        for await (const pedaco of fluxo) {
          ultimo = pedaco;
          if (pedaco.promptFeedback?.blockReason || BLOQUEIOS.has(pedaco.candidates?.[0]?.finishReason)) recusado = true;
          const texto = textoDasPartes(pedaco);
          if (texto) yield texto;
        }
        resolver({ modelo: ultimo?.modelVersion ?? modelo, uso: usoDa(ultimo), recusado });
      } catch (erro) {
        rejeitar(erro);
        throw erro;
      }
    }
    return { pedacos: pedacos(), fim };
  },

  async enviarLote(modelo, pedido, referencia) {
    const contents: Content[] = [{ role: "user", parts: partes(pedido.partes) }];
    if (JSON.stringify(contents).length > LIMITE_LOTE_BYTES) {
      // Grande demais para o lote do Gemini: a reserva (Claude) assume.
      throw new Error("Material grande demais para o lote do Gemini (máx. ~19 MB codificado)");
    }
    const lote = await gemini().batches.create({
      model: modelo,
      src: [
        {
          contents,
          // Sem thinkingConfig: o lote do Gemini já recusou esse campo
          // (github.com/googleapis/python-genai/issues/1103). O padrão é "medium".
          config: configuracao(pedido.sistema, null, pedido.maxTokens, pedido.schema),
          metadata: { referencia },
        },
      ],
      config: { displayName: `odontolab-${referencia}` },
    });
    if (!lote.name) throw new Error("Gemini não devolveu o id do lote");
    return lote.name;
  },

  async consultarLote(idLote): Promise<EstadoLote> {
    const lote = await gemini().batches.get({ name: idLote });
    if (lote.state === JobState.JOB_STATE_SUCCEEDED) {
      const item = lote.dest?.inlinedResponses?.[0];
      if (!item?.response) return { terminado: true, erro: item?.error?.message ?? "Resultado do lote vazio." };
      const modelo = item.response.modelVersion ?? lote.model ?? "gemini";
      const uso = usoDa(item.response);
      try {
        return { terminado: true, texto: textoDa(item.response), modelo, uso };
      } catch (erro) {
        return {
          terminado: true,
          modelo,
          uso,
          erro: erro instanceof RecusaIA ? "A IA recusou este material. Revise o conteúdo e tente de novo." : String((erro as Error).message),
        };
      }
    }
    if (
      lote.state === JobState.JOB_STATE_FAILED ||
      lote.state === JobState.JOB_STATE_CANCELLED ||
      lote.state === JobState.JOB_STATE_EXPIRED
    ) {
      return { terminado: true, erro: `A IA não concluiu a geração (${lote.state}). Tente novamente.` };
    }
    return { terminado: false };
  },
};
