// Ofertas de compra e renovação e o corpo do checkout do Asaas.

import { PRECO, totalParcelado } from "@/lib/preco";
import { IMAGEM_PRODUTO_BASE64 } from "./imagem-produto";

export type TipoCompra = "compra" | "renovacao";
export type Modalidade = "a_vista" | "parcelado";

export type Oferta = {
  tipo: TipoCompra;
  modalidade: Modalidade;
  valorCentavos: number;
  parcelas: number;
  nome: string;
  descricao: string;
};

function inteiroPositivo(valor: string | undefined): number | null {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Preço da renovação ainda não foi definido: fica desligado até configurar as variáveis. */
export function precoRenovacao(): { aVistaCentavos: number; parceladoCentavos: number } | null {
  const aVista = inteiroPositivo(process.env.PRECO_RENOVACAO_A_VISTA_CENTAVOS);
  const parcelado = inteiroPositivo(process.env.PRECO_RENOVACAO_PARCELADO_CENTAVOS);
  return aVista && parcelado ? { aVistaCentavos: aVista, parceladoCentavos: parcelado } : null;
}

export function obterOferta(tipo: TipoCompra, modalidade: Modalidade): Oferta | null {
  if (tipo === "compra") {
    return modalidade === "a_vista"
      ? {
          tipo,
          modalidade,
          valorCentavos: PRECO.aVistaCentavos,
          parcelas: 1,
          nome: "Acesso completo",
          descricao: "Acesso vitalício ao conteúdo + novidades e IA por 12 meses",
        }
      : {
          tipo,
          modalidade,
          valorCentavos: totalParcelado(),
          parcelas: PRECO.parcelas,
          nome: "Acesso completo",
          descricao: "Acesso vitalício ao conteúdo + novidades e IA por 12 meses",
        };
  }

  const renovacao = precoRenovacao();
  if (!renovacao) return null;
  return {
    tipo,
    modalidade,
    valorCentavos: modalidade === "a_vista" ? renovacao.aVistaCentavos : renovacao.parceladoCentavos,
    parcelas: modalidade === "a_vista" ? 1 : PRECO.parcelas,
    nome: "Renovação",
    descricao: "Novidades e IA por mais 12 meses",
  };
}

/** Corpo do POST /v3/checkouts. externalReference = id da compra no nosso banco. */
export function montarCheckout(params: { oferta: Oferta; compraId: string; urlBase: string }) {
  const { oferta, compraId, urlBase } = params;
  const parcelado = oferta.modalidade === "parcelado";
  return {
    // À vista: Pix ou cartão em 1x. Parcelado: só cartão, até 12x.
    billingTypes: parcelado ? ["CREDIT_CARD"] : ["PIX", "CREDIT_CARD"],
    chargeTypes: [parcelado ? "INSTALLMENT" : "DETACHED"],
    ...(parcelado && { installment: { maxInstallmentCount: oferta.parcelas } }),
    minutesToExpire: 60,
    externalReference: compraId,
    callback: {
      successUrl: `${urlBase}/pagamento/concluido?compra=${compraId}`,
      cancelUrl: `${urlBase}/${oferta.tipo === "renovacao" ? "renovar" : "assinar"}?cancelado=1`,
      expiredUrl: `${urlBase}/${oferta.tipo === "renovacao" ? "renovar" : "assinar"}?expirado=1`,
    },
    items: [
      {
        name: oferta.nome.slice(0, 30),
        description: oferta.descricao.slice(0, 150),
        quantity: 1,
        value: oferta.valorCentavos / 100,
        imageBase64: IMAGEM_PRODUTO_BASE64,
      },
    ],
  };
}
