import Link from "next/link";
import { AtualizarPeriodicamente } from "@/components/atualizar-periodicamente";
import { exigirLogin } from "@/lib/auth";

type Compra = { id: string; status: string; tipo: "compra" | "renovacao" };

export default async function PagamentoConcluido({ searchParams }: PageProps<"/pagamento/concluido">) {
  const { compra: compraId } = await searchParams;
  const { supabase, perfil } = await exigirLogin();

  const { data: compra } =
    typeof compraId === "string"
      ? await supabase
          .from("compras")
          .select("id, status, tipo")
          .eq("id", compraId)
          .eq("usuario_id", perfil.id)
          .maybeSingle<Compra>()
      : { data: null };

  const pago = compra?.status === "pago";
  const pendente = compra?.status === "pendente";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      {pago ? (
        <>
          <p className="text-4xl">🎉</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {compra.tipo === "renovacao" ? "Renovação confirmada!" : "Pagamento confirmado!"}
          </h1>
          <p className="text-slate-600">Seu acesso já está liberado. Bons estudos!</p>
          <Link href="/aluno" className="rounded-lg bg-teal-700 px-6 py-3 font-medium text-white hover:bg-teal-800">
            Começar a estudar
          </Link>
        </>
      ) : pendente ? (
        <>
          <h1 className="text-2xl font-bold text-slate-900">Confirmando seu pagamento…</h1>
          <p className="text-slate-600">
            Pix e cartão costumam confirmar em poucos segundos. Esta página atualiza sozinha — e você também recebe o
            acesso automaticamente se fechar agora.
          </p>
          <AtualizarPeriodicamente segundos={4} />
          <Link href="/aluno" className="text-sm font-medium text-teal-700 underline">
            Ir para a área do aluno
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-slate-900">Pagamento não encontrado</h1>
          <p className="text-slate-600">Se você acabou de pagar, aguarde alguns minutos e confira na área do aluno.</p>
          <Link href="/aluno" className="text-sm font-medium text-teal-700 underline">
            Ir para a área do aluno
          </Link>
        </>
      )}
    </main>
  );
}
