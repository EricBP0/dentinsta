import "server-only";
import { provedorAnthropic } from "./anthropic";
import { alvosDepoisDe, alvosDoUso, esforcoDoUso, type UsoIA } from "./config";
import { provedorGemini } from "./gemini";
import { fluxoComReserva, tentarEmOrdem } from "./reserva";
import type { EstadoLote, Fluxo, MensagemConversa, NomeProvedor, PedidoEstruturado, Provedor, RespostaEstruturada } from "./tipos";

export { RecusaIA, type Parte, type Uso } from "./tipos";

const PROVEDORES: Record<NomeProvedor, Provedor> = { gemini: provedorGemini, anthropic: provedorAnthropic };

/** Resposta em JSON validado (correção), tentando os modelos do uso em ordem. */
export function gerarEstruturado<T>(
  uso: UsoIA,
  pedido: Omit<PedidoEstruturado<T>, "esforco">,
): Promise<RespostaEstruturada<T>> {
  const esforco = esforcoDoUso(uso);
  return tentarEmOrdem(alvosDoUso(uso), (alvo) => PROVEDORES[alvo.provedor].gerarEstruturado(alvo.modelo, { ...pedido, esforco }), uso);
}

/** Resposta em partes (chat), trocando de modelo se o atual falhar antes de responder. */
export function conversar(params: { sistema: string; historico: MensagemConversa[]; maxTokens: number }): Fluxo {
  const esforco = esforcoDoUso("chat");
  return fluxoComReserva(alvosDoUso("chat"), (alvo) => PROVEDORES[alvo.provedor].conversar(alvo.modelo, { ...params, esforco }), "chat");
}

/**
 * Envia um pedido em lote. Devolve o id a gravar ("provedor:id") e o modelo
 * escolhido. Se o envio falhar (ex.: material grande demais), tenta o próximo.
 * `depoisDe`: reenvio de um lote que falhou; só tenta os modelos seguintes a ele.
 */
export function enviarLote<T>(
  uso: UsoIA,
  pedido: Omit<PedidoEstruturado<T>, "esforco">,
  referencia: string,
  opcoes: { depoisDe?: string } = {},
) {
  const esforco = esforcoDoUso(uso);
  const alvos = opcoes.depoisDe ? alvosDepoisDe(alvosDoUso(uso), opcoes.depoisDe) : alvosDoUso(uso);
  return tentarEmOrdem(
    alvos,
    async (alvo) => {
      const id = await PROVEDORES[alvo.provedor].enviarLote(alvo.modelo, { ...pedido, esforco }, referencia);
      return { idLote: `${alvo.provedor}:${id}`, modelo: `${alvo.provedor}:${alvo.modelo}` };
    },
    `${uso} (lote)`,
  );
}

/** Situação de um lote gravado. Ids antigos, sem prefixo, são da Anthropic. */
export function consultarLote(idGravado: string, referencia: string): Promise<EstadoLote> {
  const [prefixo, ...resto] = idGravado.split(":");
  const provedor = prefixo in PROVEDORES && resto.length ? (prefixo as NomeProvedor) : "anthropic";
  const id = provedor === prefixo ? resto.join(":") : idGravado;
  return PROVEDORES[provedor].consultarLote(id, referencia);
}
