import { Cabecalho } from "@/components/cabecalho";
import { exigirEquipe } from "@/lib/auth";

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const { perfil } = await exigirEquipe();
  return (
    <>
      <Cabecalho perfil={perfil} area="admin" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
