import Link from "next/link";
import { AtualizarPeriodicamente } from "@/components/atualizar-periodicamente";
import { Confete, Movimento } from "@/components/movimento";
import { exigirLogin } from "@/lib/auth";
import { PLANOS, type Plano } from "@/lib/planos";

type Assinatura = { id: string; status: string; plano: Plano };

export default async function PagamentoConcluido({ searchParams }: PageProps<"/pagamento/concluido">) {
  const { assinatura: assinaturaId } = await searchParams;
  const { supabase, perfil } = await exigirLogin();

  const { data: assinatura } =
    typeof assinaturaId === "string"
      ? await supabase
          .from("assinaturas")
          .select("id, status, plano")
          .eq("id", assinaturaId)
          .eq("usuario_id", perfil.id)
          .maybeSingle<Assinatura>()
      : { data: null };

  const pago = assinatura?.status === "ativa" || assinatura?.status === "cancelada";
  const pendente = assinatura?.status === "pendente";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      {pago ? (
        <Movimento>
          <div className="relative">
            <Confete quantidade={40} />
            <p className="text-4xl">🎉</p>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-tinta">Assinatura confirmada!</h1>
          <p className="text-slate-600">
            Seu plano {PLANOS[assinatura.plano].nome} já está liberado.
            {assinatura.plano === "duplo" && " Convide a segunda pessoa em Minha assinatura."} Bons estudos!
          </p>
          <Link href="/aluno" className="rounded-full bg-tinta px-6 py-3 font-bold text-white hover:bg-violeta">
            Começar a estudar
          </Link>
        </Movimento>
      ) : pendente ? (
        <>
          <h1 className="text-3xl font-extrabold tracking-tight text-tinta">Confirmando seu pagamento…</h1>
          <p className="text-slate-600">
            Pix e cartão costumam confirmar em poucos segundos. Esta página atualiza sozinha — e você também recebe o
            acesso automaticamente se fechar agora.
          </p>
          <AtualizarPeriodicamente segundos={4} />
          <Link href="/aluno" className="text-sm font-medium text-violeta-700 underline">
            Ir para a área do aluno
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-extrabold tracking-tight text-tinta">Pagamento não encontrado</h1>
          <p className="text-slate-600">Se você acabou de pagar, aguarde alguns minutos e confira na área do aluno.</p>
          <Link href="/aluno" className="text-sm font-medium text-violeta-700 underline">
            Ir para a área do aluno
          </Link>
        </>
      )}
    </main>
  );
}
