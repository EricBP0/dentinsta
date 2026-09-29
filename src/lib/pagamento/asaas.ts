import "server-only";

// Cliente mínimo da API v3 do Asaas (https://docs.asaas.com).
// ASAAS_AMBIENTE=producao usa a API real; qualquer outro valor usa o sandbox.

function urlApi() {
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

async function chamar<T>(caminho: string, corpo: unknown): Promise<T> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) throw new Error("ASAAS_API_KEY não configurada");

  const resposta = await fetch(`${urlApi()}${caminho}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "dentinsta",
      access_token: chave,
    },
    body: JSON.stringify(corpo),
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
