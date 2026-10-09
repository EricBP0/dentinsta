import "server-only";

// Cliente mínimo da API v3 do Asaas (https://docs.asaas.com).
// ASAAS_AMBIENTE=producao usa a API real; qualquer outro valor usa o sandbox.
// ASAAS_API_URL aponta para outro endereço (testes automatizados).

function urlApi() {
  if (process.env.ASAAS_API_URL) return process.env.ASAAS_API_URL.replace(/\/$/, "");
  return process.env.ASAAS_AMBIENTE === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

export class ErroAsaas extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem);
  }
}

async function chamar<T>(caminho: string, corpo?: unknown, metodo: "POST" | "DELETE" = "POST"): Promise<T> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) throw new Error("ASAAS_API_KEY não configurada");

  const resposta = await fetch(`${urlApi()}${caminho}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "OdontoLab",
      access_token: chave,
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    cache: "no-store",
  });
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const detalhe = (dados as { errors?: { description?: string }[] } | null)?.errors
      ?.map((e) => e.description)
      .join("; ");
    throw new ErroAsaas(detalhe || `Asaas respondeu ${resposta.status}`, resposta.status);
  }
  return dados as T;
}

export type CheckoutAsaas = { id: string; link: string; status: string };

export function criarCheckout(corpo: unknown) {
  return chamar<CheckoutAsaas>("/checkouts", corpo);
}

/**
 * Muda o valor das próximas cobranças de uma assinatura (troca de plano).
 * updatePendingPayments também ajusta a cobrança já gerada e ainda não paga.
 */
export function atualizarValorAssinatura(gatewayAssinaturaId: string, valorCentavos: number, descricao: string) {
  return chamar<{ id: string }>(`/subscriptions/${encodeURIComponent(gatewayAssinaturaId)}`, {
    value: valorCentavos / 100,
    description: descricao.slice(0, 500),
    updatePendingPayments: true,
  });
}

/** Cancela a assinatura no Asaas: não gera mais cobranças. */
export function cancelarAssinaturaAsaas(gatewayAssinaturaId: string) {
  return chamar<{ deleted: boolean }>(`/subscriptions/${encodeURIComponent(gatewayAssinaturaId)}`, undefined, "DELETE");
}
