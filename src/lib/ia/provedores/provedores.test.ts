// Integração com os SDKs reais do Gemini e da Anthropic contra servidores
// falsos locais: confere o que vai na requisição e a troca para a reserva.

import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.spyOn(console, "warn").mockImplementation(() => {});

type Chamada = { url: string; corpo: Record<string, unknown> };
const chamadas: Chamada[] = [];
const schema = z.object({ nota: z.number(), comentario: z.string() });
const JSON_OK = JSON.stringify({ nota: 8, comentario: "Boa resposta" });

function textoDo(corpo: unknown) {
  return JSON.stringify(corpo);
}

function respostaGemini(texto: string, finishReason = "STOP") {
  return {
    candidates: [{ content: { role: "model", parts: texto ? [{ text: texto }] : [] }, finishReason }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 5, cachedContentTokenCount: 0 },
    modelVersion: "gemini-3.6-flash",
  };
}

function servidorGemini(req: http.IncomingMessage, res: http.ServerResponse, corpo: Record<string, unknown>) {
  const url = req.url ?? "";
  const bloquear = textoDo(corpo).includes("BLOQUEAR");
  if (url.includes(":streamGenerateContent")) {
    res.writeHead(200, { "content-type": "text/event-stream" });
    const pedacos = bloquear ? [respostaGemini("", "SAFETY")] : [respostaGemini("Olá, "), respostaGemini("tudo certo.")];
    for (const p of pedacos) res.write(`data: ${JSON.stringify(p)}\n\n`);
    return res.end();
  }
  if (url.includes(":generateContent")) {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(bloquear ? respostaGemini("", "SAFETY") : respostaGemini(JSON_OK)));
  }
  if (url.includes(":batchGenerateContent")) {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ name: "batches/lote1", metadata: { state: "BATCH_STATE_PENDING" } }));
  }
  if (url.includes("/batches/lote1")) {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(
      JSON.stringify({
        name: "batches/lote1",
        metadata: {
          state: "BATCH_STATE_SUCCEEDED",
          model: "models/gemini-3.6-flash",
          output: { inlinedResponses: { inlinedResponses: [{ response: respostaGemini(JSON_OK), metadata: { referencia: "g1" } }] } },
        },
      }),
    );
  }
  res.writeHead(404).end("{}");
}

function servidorAnthropic(req: http.IncomingMessage, res: http.ServerResponse, corpo: Record<string, unknown>) {
  const mensagem = (texto: string) => ({
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [{ type: "text", text: texto }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 50, output_tokens: 10, cache_read_input_tokens: 0 },
  });
  if (corpo.stream) {
    res.writeHead(200, { "content-type": "text/event-stream" });
    const eventos = [
      { type: "message_start", message: { ...mensagem(""), content: [], usage: { input_tokens: 50, output_tokens: 0 } } },
      { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Resposta do Claude" } },
      { type: "content_block_stop", index: 0 },
      { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 10 } },
      { type: "message_stop" },
    ];
    for (const e of eventos) res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
    return res.end();
  }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(mensagem(JSON_OK)));
}

const servidores: http.Server[] = [];
async function subir(tratar: typeof servidorGemini) {
  const servidor = http.createServer((req, res) => {
    let dados = "";
    req.on("data", (c) => (dados += c));
    req.on("end", () => {
      const corpo = dados ? JSON.parse(dados) : {};
      chamadas.push({ url: req.url ?? "", corpo });
      tratar(req, res, corpo);
    });
  });
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  servidores.push(servidor);
  return `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
}

let ia: typeof import("./index");

beforeAll(async () => {
  process.env.GEMINI_API_KEY = "teste";
  process.env.GEMINI_BASE_URL = await subir(servidorGemini);
  process.env.ANTHROPIC_API_KEY = "teste";
  process.env.ANTHROPIC_BASE_URL = await subir(servidorAnthropic);
  delete process.env.IA_CORRECAO;
  delete process.env.IA_CHAT;
  delete process.env.IA_GERACAO;
  ia = await import("./index");
});
afterAll(() => servidores.forEach((s) => s.close()));

const ultimaDo = (trecho: string) => chamadas.filter((c) => c.url.includes(trecho)).at(-1)!;

describe("Gemini como principal", () => {
  it("correção: JSON validado, com schema, raciocínio e filtros configurados", async () => {
    const r = await ia.gerarEstruturado("correcao", {
      sistema: "Corrija",
      partes: [{ tipo: "texto", texto: "Resposta do aluno" }],
      schema,
      maxTokens: 8000,
    });
    expect(r).toEqual({ dados: { nota: 8, comentario: "Boa resposta" }, modelo: "gemini-3.6-flash", uso: { entrada: 100, saida: 25, cache: 0 } });
    const { url, corpo } = ultimaDo(":generateContent");
    expect(url).toContain("/models/gemini-3.6-flash:generateContent");
    const config = corpo.generationConfig as Record<string, unknown>;
    expect(config).toMatchObject({ responseMimeType: "application/json", maxOutputTokens: 8000, thinkingConfig: { thinkingLevel: "LOW" } });
    expect(config.responseJsonSchema).toMatchObject({ type: "object", required: ["nota", "comentario"] });
    expect(corpo.systemInstruction).toMatchObject({ parts: [{ text: "Corrija" }] });
    expect(corpo.safetySettings).toContainEqual({ category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" });
  });

  it("chat: pedaços em ordem e uso no fim", async () => {
    const fluxo = ia.conversar({ sistema: "Professor", historico: [{ papel: "user", conteudo: "Oi" }], maxTokens: 8000 });
    let texto = "";
    for await (const p of fluxo.pedacos) texto += p;
    expect(texto).toBe("Olá, tudo certo.");
    expect(await fluxo.fim).toMatchObject({ modelo: "gemini-3.6-flash", recusado: false });
  });

  it("lote: envia, guarda o provedor no id e lê o resultado", async () => {
    const { idLote, modelo } = await ia.enviarLote(
      "geracao",
      { sistema: "Gere", partes: [{ tipo: "pdf", nome: "a.pdf", dados: Buffer.from("%PDF") }, { tipo: "texto", texto: "Pedido" }], schema, maxTokens: 32000 },
      "g1",
    );
    expect({ idLote, modelo }).toEqual({ idLote: "gemini:batches/lote1", modelo: "gemini:gemini-3.6-flash" });
    const pedido = ultimaDo(":batchGenerateContent").corpo;
    expect(textoDo(pedido)).toContain("application/pdf");
    expect(textoDo(pedido)).toContain("MEDIUM");
    expect(await ia.consultarLote(idLote, "g1")).toMatchObject({ terminado: true, texto: JSON_OK, modelo: "gemini-3.6-flash" });
  });
});

describe("Claude de reserva", () => {
  it("correção bloqueada pelo Gemini vai para o Claude", async () => {
    const r = await ia.gerarEstruturado("correcao", {
      sistema: "Corrija",
      partes: [{ tipo: "texto", texto: "BLOQUEAR esta resposta" }],
      schema,
      maxTokens: 8000,
    });
    expect(r.modelo).toBe("claude-opus-5-5");
    expect(r.dados.nota).toBe(8);
    expect(ultimaDo("/v1/messages").corpo).toMatchObject({ model: "claude-opus-5-5", system: "Corrija" });
  });

  it("chat bloqueado pelo Gemini é respondido pelo Claude", async () => {
    const fluxo = ia.conversar({ sistema: "Professor", historico: [{ papel: "user", conteudo: "BLOQUEAR" }], maxTokens: 8000 });
    let texto = "";
    for await (const p of fluxo.pedacos) texto += p;
    expect(texto).toBe("Resposta do Claude");
    expect((await fluxo.fim).modelo).toBe("claude-opus-5-5");
  });

  it("lotes antigos (id sem provedor) continuam sendo lidos na Anthropic", async () => {
    const antes = chamadas.length;
    await ia.consultarLote("msgbatch_antigo", "x").catch(() => {});
    expect(chamadas.slice(antes).some((c) => c.url.includes("/v1/messages/batches/msgbatch_antigo"))).toBe(true);
  });
});
