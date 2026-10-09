import { Cabecalho } from "@/components/cabecalho";
import { Movimento } from "@/components/movimento";
import { RegistroTempo } from "./registro-tempo";
import { exigirLogin } from "@/lib/auth";

export default async function LayoutAluno({ children }: LayoutProps<"/aluno">) {
  const { supabase, perfil } = await exigirLogin();
  const { count: respostasNovas } = await supabase
    .from("feedbacks")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", perfil.id)
    .eq("resposta_vista", false);
  return (
    <>
      <Cabecalho perfil={perfil} area="aluno" avisos={{ "/aluno/feedback": respostasNovas ?? 0 }} />
      <RegistroTempo />
      <Movimento>
        <div className="fundo-marca flex flex-1 flex-col">
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        </div>
      </Movimento>
    </>
  );
}
