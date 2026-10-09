// Contrato comum dos provedores de IA. Cada uso (correção, chat, geração) tem
// uma lista de modelos em ordem; o primeiro que responder vale (ver config.ts).

import type { z } from "zod";

export type NomeProvedor = "gemini" | "anthropic";
export type Esforco = "low" | "medium" | "high" | "xhigh" | "max";

/** Um modelo de um provedor, ex.: { provedor: "gemini", modelo: "gemini-3.6-flash" }. */
export type Alvo = { provedor: NomeProvedor; modelo: string };

/** Pedaço do que vai para a IA: texto, PDF ou imagem. */
export type Parte =
  | { tipo: "texto"; texto: string; titulo?: string }
  | { tipo: "pdf"; nome: string; dados: Buffer }
  | { tipo: "imagem"; nome: string; mime: string; dados: Buffer };

export type Uso = { entrada: number; saida: number; cache: number };

export type PedidoEstruturado<T> = {
  sistema: string;
  partes: Parte[];
  schema: z.ZodType<T>;
  esforco: Esforco;
  maxTokens: number;
};

export type RespostaEstruturada<T> = { dados: T; modelo: string; uso: Uso };

export type MensagemConversa = { papel: "user" | "assistant"; conteudo: string };

/** Resposta em partes (chat). `fim` resolve depois do último pedaço. */
export type Fluxo = {
  pedacos: AsyncIterable<string>;
  fim: Promise<{ modelo: string; uso: Uso; recusado: boolean }>;
};

/** Resultado de um lote: ainda rodando, pronto (texto) ou com erro. */
export type EstadoLote =
  | { terminado: false }
  | { terminado: true; texto: string; modelo: string; uso: Uso }
  | { terminado: true; erro: string; modelo?: string; uso?: Uso };

/** A IA recusou ou bloqueou (filtro de segurança): vale tentar o próximo da lista. */
export class RecusaIA extends Error {}

export interface Provedor {
  nome: NomeProvedor;
  /** Tem chave configurada? */
  disponivel(): boolean;
  gerarEstruturado<T>(modelo: string, pedido: PedidoEstruturado<T>): Promise<RespostaEstruturada<T>>;
  conversar(modelo: string, params: { sistema: string; historico: MensagemConversa[]; esforco: Esforco; maxTokens: number }): Fluxo;
  /** Envia um pedido em lote (mais barato, sem pressa). Devolve o id do lote no provedor. */
  enviarLote<T>(modelo: string, pedido: PedidoEstruturado<T>, referencia: string): Promise<string>;
  consultarLote(idLote: string, referencia: string): Promise<EstadoLote>;
}
