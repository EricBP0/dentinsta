import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormularioEntrar } from "@/app/entrar/formulario";
import { Logo } from "@/components/marca/logo";
import { obterSessao } from "@/lib/auth";

export const metadata: Metadata = { title: "Parceiros" };

export default async function EntrarParceiro({ searchParams }: PageProps<"/parceiro/entrar">) {
  const { erro } = await searchParams;
  if ((await obterSessao()).perfil) redirect("/parceiro");
  return (
    <main className="grade-tinta flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <Link href="/" aria-label="OdontoLab — início" className="flex items-center gap-2">
        <Logo tamanho="lg" claro />
      </Link>
      <span className="rotulo rounded-md bg-lima px-2.5 py-1 text-[11px] font-bold text-tinta">Parceiros</span>
      <FormularioEntrar proximo="/parceiro" erroLink={erro === "link"} semCadastro />
      <p className="max-w-sm text-center text-sm text-white/70">
        Primeiro acesso? Use o link do e-mail de boas-vindas para criar sua senha, ou “Esqueci minha senha”.
      </p>
    </main>
  );
}
