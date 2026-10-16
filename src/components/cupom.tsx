import { TicketPercent } from "lucide-react";
import { removerCupom } from "@/app/assinar/actions";
import { afiliadoDaVisita } from "@/lib/afiliado-visita";
import { descontoCentavos } from "@/lib/afiliados";
import { obterSessao } from "@/lib/auth";
import type { Escolha } from "@/lib/planos";
import { formatarReais } from "@/lib/preco";
import { FormularioCupom } from "./cupom-formulario";

/** Cupom de afiliado nas telas de pagamento: o aplicado (com o desconto) ou o campo para digitar. */
export async function FaixaCupom({ voltar, escolha }: { voltar: string; escolha?: Escolha }) {
  const [visita, { perfil }] = await Promise.all([afiliadoDaVisita(), obterSessao()]);
  if (!visita?.cupom) return <FormularioCupom voltar={voltar} />;

  const proprio = perfil && visita.usuarioId === perfil.id;
  const desconto = escolha ? descontoCentavos(escolha.valorCentavos, visita.descontoPct) : 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-tinta bg-lima/40 p-3 text-sm text-tinta">
      <p className="flex items-center gap-2">
        <TicketPercent className="size-4 shrink-0" />
        {proprio ? (
          <span>
            O cupom <strong>{visita.cupom}</strong> é seu: não vale para a sua própria assinatura.
          </span>
        ) : (
          <span>
            Cupom <strong>{visita.cupom}</strong>: {Number(visita.descontoPct).toLocaleString("pt-BR")}% de desconto na primeira
            cobrança
            {escolha && desconto > 0 && (
              <>
                {" "}
                (<strong>{formatarReais(escolha.valorCentavos - desconto)}</strong> em vez de {formatarReais(escolha.valorCentavos)})
              </>
            )}
            .
          </span>
        )}
      </p>
      <form action={removerCupom}>
        <input type="hidden" name="voltar" value={voltar} />
        <button className="text-xs font-semibold underline">Remover</button>
      </form>
    </div>
  );
}
