import Link from "next/link";
import { Logo } from "@/components/marca/logo";
import { FormularioEntrar } from "./formulario";

export default async function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  const { proximo, erro } = await searchParams;
  return (
    <main className="fundo-marca flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <Link href="/" aria-label="OdontoLab — início">
        <Logo tamanho="lg" />
      </Link>
      <FormularioEntrar proximo={typeof proximo === "string" ? proximo : undefined} erroLink={erro === "link"} />
    </main>
  );
}
