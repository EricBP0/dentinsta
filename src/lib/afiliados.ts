// Afiliados: link, cupom, desconto e a conferência automática dos saques.
// Puro e testável; as regras do banco estão na migration 0018.

export const CARENCIA_DIAS = 30;
export const SAQUE_MINIMO_CENTAVOS = 5000;
/** Por quanto tempo o link marca o visitante. */
export const DIAS_DO_LINK = 30;
/** Cancelar a renovação até este dia depois de pagar é um alerta na conferência. */
export const DIAS_DE_ARREPENDIMENTO = 7;

export const COOKIE_AFILIADO = "odl_ref";
export const COOKIE_CUPOM = "odl_cupom";

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Código do link: "Dra. Ana Lima" → "dra-ana-lima". */
export function normalizarCodigo(valor: string): string | null {
  const codigo = semAcento(valor)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return /^[a-z0-9-]{3,30}$/.test(codigo) ? codigo : null;
}

/** Cupom: só letras e números, em maiúsculas. */
export function normalizarCupom(valor: string): string | null {
  const cupom = semAcento(valor).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z0-9]{3,20}$/.test(cupom) ? cupom : null;
}

/** CPF (11) ou CNPJ (14), só dígitos. */
export function normalizarDocumento(valor: string): string | null {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length === 11 || digitos.length === 14 ? digitos : null;
}

/** Desconto do cupom na primeira cobrança (em centavos, arredondado). */
export function descontoCentavos(valorPrimeiraCobranca: number, descontoPct: number): number {
  if (descontoPct <= 0) return 0;
  return Math.min(valorPrimeiraCobranca - 100, Math.round((valorPrimeiraCobranca * descontoPct) / 100));
}

export function comissaoCentavos(valorBase: number, comissaoPct: number): number {
  return Math.round((valorBase * comissaoPct) / 100);
}

export const TIPOS_PIX = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Celular",
  EVP: "Chave aleatória",
} as const;
export type TipoPix = keyof typeof TIPOS_PIX;

/** Confere e normaliza a chave Pix para o tipo escolhido. */
export function validarChavePix(tipo: string, chave: string): { tipo: TipoPix; chave: string } | null {
  const valor = chave.trim();
  const digitos = valor.replace(/\D/g, "");
  switch (tipo) {
    case "CPF":
      return digitos.length === 11 ? { tipo, chave: digitos } : null;
    case "CNPJ":
      return digitos.length === 14 ? { tipo, chave: digitos } : null;
    case "EMAIL":
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor) ? { tipo, chave: valor.toLowerCase() } : null;
    case "PHONE": {
      const fone = digitos.length >= 12 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
      return /^[1-9][0-9]{9,10}$/.test(fone) ? { tipo, chave: fone } : null;
    }
    case "EVP":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor) ? { tipo, chave: valor.toLowerCase() } : null;
    default:
      return null;
  }
}

/** Nome do cliente para o afiliado: "Ana Souza Lima" → "Ana L." (sem expor o resto). */
export function nomeReservado(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "Cliente";
  return partes.length === 1 ? partes[0] : `${partes[0]} ${partes.at(-1)![0].toUpperCase()}.`;
}

// -----------------------------------------------------------------------------
// Conferência automática do saque
// -----------------------------------------------------------------------------

export type ItemConferencia = {
  comissaoId: string;
  comissaoStatus: string;
  valorCentavos: number;
  valorBaseCentavos: number;
  comissaoPct: number;
  liberadaEm: string;
  compraStatus: string;
  pagoEm: string | null;
  clienteId: string;
  clienteEmail: string;
  clienteTelefone: string | null;
  /** Cliente do Asaas (um por CPF) usado nesse pagamento. */
  clienteGatewayId: string | null;
  assinaturaStatus: string | null;
  canceladaEm: string | null;
};

export type AfiliadoConferencia = {
  usuarioId: string | null;
  email: string;
  telefone: string | null;
  /** Clientes do Asaas das compras feitas pela própria conta do afiliado. */
  gatewayIdsProprios: string[];
};

/** Todos os clientes já indicados pelo afiliado (para achar contas repetidas). */
export type ClienteIndicado = { clienteId: string; telefone: string | null; gatewayIds: string[] };

export type NivelConferencia = "ok" | "alerta" | "bloqueio";
export type ResultadoItem = { comissaoId: string; nivel: NivelConferencia; motivos: string[]; valorCentavos: number };
export type ResultadoConferencia = {
  itens: ResultadoItem[];
  totais: Record<NivelConferencia, { quantidade: number; centavos: number }>;
  conferidoEm: string;
};

/**
 * Confere cada comissão do saque. Bloqueio: não deve ser paga (estorno,
 * carência, autoindicação, valor errado). Alerta: precisa de um olho humano
 * (cancelou logo depois de pagar, possível conta duplicada).
 */
export function conferirSaque(
  itens: ItemConferencia[],
  afiliado: AfiliadoConferencia,
  clientes: ClienteIndicado[],
  agora: Date = new Date(),
): ResultadoConferencia {
  const resultado = itens.map((item): ResultadoItem => {
    const bloqueios: string[] = [];
    const alertas: string[] = [];

    if (item.comissaoStatus !== "em_saque") bloqueios.push(`Comissão ${item.comissaoStatus} (saiu do saque)`);
    if (item.compraStatus !== "pago") bloqueios.push(`Pagamento ${item.compraStatus}`);
    if (new Date(item.liberadaEm).getTime() > agora.getTime()) bloqueios.push("Ainda está na carência");
    if (comissaoCentavos(item.valorBaseCentavos, item.comissaoPct) !== item.valorCentavos) {
      bloqueios.push("Valor da comissão não confere com o pagamento");
    }

    const mesmaPessoa =
      item.clienteId === afiliado.usuarioId ||
      item.clienteEmail.toLowerCase() === afiliado.email.toLowerCase() ||
      (item.clienteTelefone !== null && item.clienteTelefone === afiliado.telefone) ||
      (item.clienteGatewayId !== null && afiliado.gatewayIdsProprios.includes(item.clienteGatewayId));
    if (mesmaPessoa) bloqueios.push("Autoindicação: o cliente é o próprio afiliado");

    const outros = clientes.filter((c) => c.clienteId !== item.clienteId);
    if (item.clienteTelefone && outros.some((c) => c.telefone === item.clienteTelefone)) {
      alertas.push("Mesmo WhatsApp de outro cliente indicado (possível conta duplicada)");
    }
    if (item.clienteGatewayId && outros.some((c) => c.gatewayIds.includes(item.clienteGatewayId!))) {
      alertas.push("Mesmo CPF no Asaas de outro cliente indicado (conta duplicada)");
    }
    if (item.canceladaEm && item.pagoEm) {
      const dias = (new Date(item.canceladaEm).getTime() - new Date(item.pagoEm).getTime()) / 864e5;
      if (dias <= DIAS_DE_ARREPENDIMENTO) alertas.push(`Cancelou a renovação ${Math.max(0, Math.floor(dias))} dia(s) depois de pagar`);
    }

    const nivel: NivelConferencia = bloqueios.length ? "bloqueio" : alertas.length ? "alerta" : "ok";
    return { comissaoId: item.comissaoId, nivel, motivos: [...bloqueios, ...alertas], valorCentavos: item.valorCentavos };
  });

  const totais = { ok: { quantidade: 0, centavos: 0 }, alerta: { quantidade: 0, centavos: 0 }, bloqueio: { quantidade: 0, centavos: 0 } };
  for (const r of resultado) {
    totais[r.nivel].quantidade += 1;
    totais[r.nivel].centavos += r.valorCentavos;
  }
  return { itens: resultado, totais, conferidoEm: agora.toISOString() };
}
