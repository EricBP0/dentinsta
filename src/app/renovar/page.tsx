import Link from "next/link";
import { redirect } from "next/navigation";
import { AvisoCheckout, OpcoesPagamento } from "@/components/ofertas";
import { exigirLogin } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import { obterOferta } from "@/lib/pagamento/ofertas";

export default async function Renovar({ searchParams }: PageProps<"/renovar">) {
  const { erro, cancelado, expirado } = await searchParams;
  const { supabase, perfil } = await exigirLogin();

  const { data: acesso } = await supabase
    .from("acessos")
    .select("novidades_ate")
    .eq("usuario_id", perfil.id)
    .maybeSingle<{ novidades_ate: string }>();
  if (!acesso) redirect("/assinar");

  const vencido = new Date(acesso.novidades_ate) < new Date();
  const aVista = obterOferta("renovacao", "a_vista");
  const parcelado = obterOferta("renovacao", "parcelado");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-12">
      <Link href="/aluno" className="text-sm text-slate-600 hover:text-slate-900">
        ← Voltar para os estudos
      </Link>
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-tinta">Renovar novidades e IA</h1>
        <p className="text-slate-700">
          {vencido
            ? `Seu período de novidades terminou em ${formatarData(acesso.novidades_ate)}.`
            : `Seu período de novidades vai até ${formatarData(acesso.novidades_ate)}. A renovação soma 12 meses a partir dessa data.`}{" "}
          Com a renovação você libera todo o conteúdo novo e volta a usar a IA por mais 12 meses. O que você já tem
          continua seu para sempre.
        </p>
      </header>

      {aVista && parcelado ? (
        <>
          <AvisoCheckout
            erro={typeof erro === "string" ? erro : undefined}
            cancelado={cancelado === "1"}
            expirado={expirado === "1"}
          />
          <OpcoesPagamento aVista={aVista} parcelado={parcelado} />
        </>
      ) : (
        <p className="rounded-2xl border-2 border-tinta bg-white p-6 text-slate-700">
          A renovação estará disponível em breve.
        </p>
      )}
    </main>
  );
}
