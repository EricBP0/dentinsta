import { Cabecalho } from "@/components/cabecalho";
import { exigirEquipe } from "@/lib/auth";

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const { supabase, perfil } = await exigirEquipe();
  const { count: abertos } = await supabase
    .from("feedbacks")
    .select("id", { count: "exact", head: true })
    .eq("status", "aberto");
  return (
    <>
      <Cabecalho perfil={perfil} area="admin" avisos={{ "/admin/feedbacks": abertos ?? 0 }} />
      <div className="fundo-marca flex flex-1 flex-col">
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </div>
    </>
  );
}
