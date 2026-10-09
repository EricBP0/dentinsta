import { Cabecalho } from "@/components/cabecalho";
import { Movimento } from "@/components/movimento";
import { RegistroTempo } from "./registro-tempo";
import { exigirLogin } from "@/lib/auth";

export default async function LayoutAluno({ children }: LayoutProps<"/aluno">) {
  const { perfil } = await exigirLogin();
  return (
    <>
      <Cabecalho perfil={perfil} area="aluno" />
      <RegistroTempo />
      <Movimento>
        <div className="fundo-marca flex flex-1 flex-col">
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        </div>
      </Movimento>
    </>
  );
}
