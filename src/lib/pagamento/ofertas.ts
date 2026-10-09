// Corpo do checkout do Asaas para cada assinatura.
//
// Mensal: checkout recorrente (o Asaas só aceita cartão de crédito), cobrado
// todo mês até o aluno cancelar.
// Anual: pagamento único que libera 12 meses — à vista (Pix ou cartão 1x) ou
// parcelado no cartão em até 12x.

import { nomeDaEscolha, MODULOS, PLANOS, type Escolha } from "@/lib/planos";
import { IMAGEM_PRODUTO_BASE64 } from "./imagem-produto";

export type ModalidadeAnual = "a_vista" | "parcelado";
export const PARCELAS_ANUAL = 12;

/** "2026-10-09 14:30:00" no horário de Brasília (formato que o Asaas espera). */
export function dataAsaas(data: Date): string {
  const brasilia = new Date(data.getTime() - 3 * 60 * 60 * 1000);
  return brasilia.toISOString().slice(0, 19).replace("T", " ");
}

function descricao(escolha: Escolha): string {
  if (escolha.plano !== "essencial") return `${PLANOS[escolha.plano].resumo}.`;
  return escolha.modulos.map((m) => MODULOS[m].nome).join(", ");
}

/** Corpo do POST /v3/checkouts. externalReference = id da assinatura no nosso banco. */
export function montarCheckoutAssinatura(params: {
  escolha: Escolha;
  assinaturaId: string;
  urlBase: string;
  modalidadeAnual?: ModalidadeAnual;
  agora?: Date;
}) {
  const { escolha, assinaturaId, urlBase, agora = new Date() } = params;
  const mensal = escolha.ciclo === "mensal";
  const parcelado = !mensal && params.modalidadeAnual === "parcelado";

  const cobranca = mensal
    ? {
        billingTypes: ["CREDIT_CARD"],
        chargeTypes: ["RECURRENT"],
        // Primeira cobrança agora; as seguintes no mesmo dia dos próximos meses.
        subscription: {
          cycle: "MONTHLY",
          nextDueDate: dataAsaas(agora),
          endDate: dataAsaas(new Date(agora.getTime() + 10 * 365 * 24 * 60 * 60 * 1000)),
        },
      }
    : parcelado
      ? { billingTypes: ["CREDIT_CARD"], chargeTypes: ["INSTALLMENT"], installment: { maxInstallmentCount: PARCELAS_ANUAL } }
      : { billingTypes: ["PIX", "CREDIT_CARD"], chargeTypes: ["DETACHED"] };

  return {
    ...cobranca,
    minutesToExpire: 60,
    externalReference: assinaturaId,
    callback: {
      successUrl: `${urlBase}/pagamento/concluido?assinatura=${assinaturaId}`,
      cancelUrl: `${urlBase}/assinar?cancelado=1`,
      expiredUrl: `${urlBase}/assinar?expirado=1`,
    },
    items: [
      {
        name: `OdontoLab ${nomeDaEscolha(escolha)}`.slice(0, 30),
        description: (mensal ? `Assinatura mensal: ${descricao(escolha)}` : `12 meses: ${descricao(escolha)}`).slice(0, 150),
        quantity: 1,
        value: escolha.valorCentavos / 100,
        imageBase64: IMAGEM_PRODUTO_BASE64,
      },
    ],
  };
}
