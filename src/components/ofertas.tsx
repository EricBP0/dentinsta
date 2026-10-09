const MENSAGENS_ERRO: Record<string, string> = {
  falha: "Não conseguimos abrir o pagamento agora. Tente de novo em instantes.",
  indisponivel: "Essa combinação de plano não está disponível. Escolha de novo.",
};

export function AvisoCheckout({ erro, cancelado, expirado }: { erro?: string; cancelado?: boolean; expirado?: boolean }) {
  const texto = erro
    ? (MENSAGENS_ERRO[erro] ?? MENSAGENS_ERRO.falha)
    : cancelado
      ? "Pagamento cancelado. Você pode tentar de novo quando quiser."
      : expirado
        ? "O tempo para pagar expirou. Gere um novo pagamento."
        : null;
  if (!texto) return null;
  return <p className="rounded-2xl border-2 border-tinta bg-amber-50 p-3 text-sm text-amber-900">{texto}</p>;
}
