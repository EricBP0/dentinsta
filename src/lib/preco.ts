// Preço real = à vista. O parcelado embute as taxas (docs/PLANEJAMENTO.md, seção 4.1).
export const PRECO = {
  aVistaCentavos: 29790,
  parcelas: 12,
  parcelaCentavos: 3290,
} as const;

export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function totalParcelado(): number {
  return PRECO.parcelas * PRECO.parcelaCentavos;
}
