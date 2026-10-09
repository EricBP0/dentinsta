import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { RecusaIA, type EstadoLote, type Fluxo, type Parte, type Provedor } from "./tipos";

// Provedor Anthropic (Claude), chave ANTHROPIC_API_KEY. Com server-side
// fallback: se o modelo recusar por engano (termos clínicos), a própria API
// tenta outro modelo Claude antes de devolver a recusa.

let cliente: Anthropic | null = null;
function anthropic() {
  cliente ??= new Anthropic();
  return cliente;
}

const BETAS = ["server-side-fallback-2026-07-01"];

function blocos(lista: Parte[]): Anthropic.ContentBlockParam[] {
  return lista.flatMap((p): Anthropic.ContentBlockParam[] => {
    if (p.tipo === "texto") {
      return p.titulo
        ? [{ type: "document", title: p.titulo, source: { type: "text", media_type: "text/plain", data: p.texto } }]
        : [{ type: "text", text: p.texto }];
    }
    if (p.tipo === "pdf") {
      return [
        {
          type: "document",
          title: p.nome,
          source: { type: "base64", media_type: "application/pdf", data: p.dados.toString("base64") },
        },
      ];
    }
    return [
      { type: "text", text: `Imagem do material: ${p.nome}` },
      {
        type: "image",
        source: {
          type: "base64",
          media_type: p.mime as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
          data: p.dados.toString("base64"),
        },
      },
    ];
  });
}

export const provedorAnthropic: Provedor = {
  nome: "anthropic",
  disponivel: () => Boolean(process.env.ANTHROPIC_API_KEY),

  async gerarEstruturado(modelo, pedido) {
    const resposta = await anthropic().beta.messages.parse({
      model: modelo,
      max_tokens: pedido.maxTokens,
      betas: BETAS,
      fallbacks: "default",
      system: pedido.sistema,
      output_config: { effort: pedido.esforco, format: betaZodOutputFormat(pedido.schema) },
      messages: [{ role: "user", content: blocos(pedido.partes) as Anthropic.Beta.BetaContentBlockParam[] }],
    });
    if (resposta.stop_reason === "refusal") {
      throw new RecusaIA(resposta.stop_details?.explanation ?? "Claude recusou");
    }
    if (!resposta.parsed_output) throw new Error(`Resposta do Claude inválida (stop_reason: ${resposta.stop_reason})`);
    return {
      dados: resposta.parsed_output,
      modelo: resposta.model,
      uso: {
        entrada: resposta.usage.input_tokens,
        saida: resposta.usage.output_tokens,
        cache: resposta.usage.cache_read_input_tokens ?? 0,
      },
    };
  },

  conversar(modelo, { sistema, historico, esforco, maxTokens }): Fluxo {
    const stream = anthropic().beta.messages.stream({
      model: modelo,
      max_tokens: maxTokens,
      betas: BETAS,
      fallbacks: "default",
      output_config: { effort: esforco },
      cache_control: { type: "ephemeral" },
      system: sistema,
      messages: historico.map((m) => ({ role: m.papel, content: m.conteudo })),
    });
    const fim = stream.finalMessage().then((final) => ({
      modelo: final.model,
      recusado: final.stop_reason === "refusal",
      uso: {
        entrada: final.usage.input_tokens,
        saida: final.usage.output_tokens,
        cache: final.usage.cache_read_input_tokens ?? 0,
      },
    }));
    fim.catch(() => {});
    async function* pedacos() {
      for await (const evento of stream) {
        if (evento.type === "content_block_delta" && evento.delta.type === "text_delta") yield evento.delta.text;
      }
    }
    return { pedacos: pedacos(), fim };
  },

  async enviarLote(modelo, pedido, referencia) {
    const lote = await anthropic().messages.batches.create({
      requests: [
        {
          custom_id: referencia,
          params: {
            model: modelo,
            max_tokens: pedido.maxTokens,
            system: pedido.sistema,
            output_config: {
              effort: pedido.esforco,
              format: { type: "json_schema", schema: zodOutputFormat(pedido.schema).schema },
            },
            messages: [{ role: "user", content: blocos(pedido.partes) }],
          },
        },
      ],
    });
    return lote.id;
  },

  async consultarLote(idLote, referencia): Promise<EstadoLote> {
    const lote = await anthropic().messages.batches.retrieve(idLote);
    if (lote.processing_status !== "ended") return { terminado: false };
    for await (const item of await anthropic().messages.batches.results(idLote)) {
      if (item.custom_id !== referencia) continue;
      if (item.result.type !== "succeeded") {
        return { terminado: true, erro: `A IA não concluiu a geração (${item.result.type}). Tente novamente.` };
      }
      const mensagem = item.result.message;
      const uso = {
        entrada: mensagem.usage.input_tokens,
        saida: mensagem.usage.output_tokens,
        cache: mensagem.usage.cache_read_input_tokens ?? 0,
      };
      if (mensagem.stop_reason === "refusal") {
        return { terminado: true, modelo: mensagem.model, uso, erro: "A IA recusou este material. Revise o conteúdo e tente de novo." };
      }
      if (mensagem.stop_reason === "max_tokens") {
        return { terminado: true, modelo: mensagem.model, uso, erro: "A resposta ficou longa demais. Peça menos itens por geração." };
      }
      const texto = mensagem.content.find((b) => b.type === "text");
      if (texto?.type !== "text") return { terminado: true, modelo: mensagem.model, uso, erro: "Resposta da IA vazia. Tente novamente." };
      return { terminado: true, texto: texto.text, modelo: mensagem.model, uso };
    }
    return { terminado: true, erro: "Resultado da geração não encontrado." };
  },
};
