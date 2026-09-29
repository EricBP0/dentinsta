import Link from "next/link";
import { FormularioEntrar } from "./formulario";

export default async function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  const { proximo } = await searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <Link href="/" className="text-2xl font-bold text-teal-800">
        dentinsta
      </Link>
      <FormularioEntrar proximo={typeof proximo === "string" ? proximo : undefined} />
    </main>
  );
}
