import Link from "next/link";
import { Logo } from "@/components/marca/logo";
import { redirect } from "next/navigation";
import { AvisoCheckout, OpcoesPagamento } from "@/components/ofertas";
import { exigirLogin } from "@/lib/auth";
import { obterOferta } from "@/lib/pagamento/ofertas";

export default async function Assinar({ searchParams }: PageProps<"/assinar">) {
  const { erro, cancelado, expirado } = await searchParams;
  const { supabase, perfil } = await exigirLogin();

  const { data: acesso } = await supabase.from("acessos").select("usuario_id").eq("usuario_id", perfil.id).maybeSingle();
  if (acesso) redirect("/renovar");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-12">
      <Link href="/" aria-label="OdontoLab — início" className="inline-block">
        <Logo />
      </Link>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-tinta">Liberar acesso completo</h1>
        <ul className="space-y-1 text-slate-700">
          <li>✓ Acesso vitalício a todo o conteúdo publicado até 12 meses após a compra</li>
          <li>✓ Novas disciplinas, aulas e a IA (simulados e correção) por 12 meses</li>
          <li>✓ Certificado por disciplina</li>
        </ul>
      </header>

      <AvisoCheckout
        erro={typeof erro === "string" ? erro : undefined}
        cancelado={cancelado === "1"}
        expirado={expirado === "1"}
      />
      <OpcoesPagamento aVista={obterOferta("compra", "a_vista")!} parcelado={obterOferta("compra", "parcelado")!} />

      <p className="text-center text-xs text-slate-500">
        Pagamento processado com segurança pelo Asaas. Você será levado à página de pagamento e volta para cá ao
        concluir.
      </p>
    </main>
  );
}
