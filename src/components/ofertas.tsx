import { iniciarCheckout } from "@/app/assinar/actions";
import type { Oferta } from "@/lib/pagamento/ofertas";
import { formatarReais } from "@/lib/preco";

const MENSAGENS_ERRO: Record<string, string> = {
  falha: "Não conseguimos abrir o pagamento agora. Tente de novo em instantes.",
  indisponivel: "Esta opção ainda não está disponível.",
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

/** Os dois botões de pagamento (à vista e parcelado) de uma compra ou renovação. */
export function OpcoesPagamento({ aVista, parcelado }: { aVista: Oferta; parcelado: Oferta }) {
  const desconto = Math.round((1 - aVista.valorCentavos / parcelado.valorCentavos) * 100);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form action={iniciarCheckout} className="flex flex-col gap-3 rounded-2xl border-2 border-tinta bg-white p-6">
        <input type="hidden" name="tipo" value={aVista.tipo} />
        <input type="hidden" name="modalidade" value="a_vista" />
        <div className="flex items-center justify-between">
          <p className="font-medium text-slate-900">À vista</p>
          {desconto > 0 && (
            <span className="rounded-full bg-violeta-100 px-2 py-0.5 text-xs font-medium text-violeta-800">
              {desconto}% de desconto
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-slate-900">{formatarReais(aVista.valorCentavos)}</p>
        <p className="text-sm text-slate-600">Pix ou cartão de crédito em 1x. Pix libera o acesso na hora.</p>
        <button className="mt-auto rounded-full bg-tinta py-3 font-bold text-white hover:bg-violeta">
          Pagar à vista
        </button>
      </form>

      <form action={iniciarCheckout} className="flex flex-col gap-3 rounded-2xl border-2 border-tinta bg-white p-6">
        <input type="hidden" name="tipo" value={parcelado.tipo} />
        <input type="hidden" name="modalidade" value="parcelado" />
        <p className="font-medium text-slate-900">Parcelado</p>
        <p className="text-3xl font-bold text-slate-900">
          {parcelado.parcelas}x {formatarReais(Math.round(parcelado.valorCentavos / parcelado.parcelas))}
        </p>
        <p className="text-sm text-slate-600">
          Sem juros no cartão de crédito (total {formatarReais(parcelado.valorCentavos)}).
        </p>
        <button className="mt-auto rounded-full border-2 border-tinta py-3 font-bold text-tinta hover:bg-lima">
          Pagar parcelado
        </button>
      </form>
    </div>
  );
}
