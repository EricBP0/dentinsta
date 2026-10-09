import Link from "next/link";
import { redirect } from "next/navigation";
import { temModulo } from "@/lib/acesso";
import { exigirLogin } from "@/lib/auth";
import { carregarAcesso } from "@/lib/catalogo";
import type { Respostas } from "@/lib/perfil-cliente";
import { botaoMarca } from "@/components/sistema";
import { Questionario } from "./questionario";

type Linha = { respostas: Respostas; etapa1_em: string | null; etapa2_em: string | null };

/** "Personalize sua OdontoLab": etapa 1 no primeiro acesso, etapa 2 a partir do 3º dia. */
export default async function Personalizar({ searchParams }: PageProps<"/aluno/personalizar">) {
  const params = await searchParams;
  const { supabase, perfil } = await exigirLogin();
  const equipe = perfil.papel !== "aluno";
  const [acesso, { data: linha }, { data: disciplinas }] = await Promise.all([
    carregarAcesso(supabase, perfil),
    supabase
      .from("perfis_cliente")
      .select("respostas, etapa1_em, etapa2_em")
      .eq("usuario_id", perfil.id)
      .maybeSingle<Linha>(),
    supabase
      .from("disciplinas")
      .select("id, nome")
      .eq("status", "publicada")
      .order("ordem")
      .overrideTypes<{ id: string; nome: string }[], { merge: false }>(),
  ]);
  if (!acesso && !equipe) redirect("/assinar");

  const etapa = linha?.etapa1_em && params.etapa !== "1" ? 2 : 1;
  if (etapa === 2 && linha?.etapa2_em) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-3xl border-2 border-tinta bg-white p-8 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-tinta">Seu perfil está completo</h1>
        <p className="text-slate-600">Obrigado! Suas respostas já personalizam o seu painel.</p>
        <Link href="/aluno" className={botaoMarca}>
          Ir para o painel
        </Link>
      </div>
    );
  }

  return (
    <Questionario
      etapa={etapa}
      anteriores={linha?.respostas ?? {}}
      disciplinas={disciplinas ?? []}
      premio={etapa === 2 && !temModulo(acesso, "flashcards", equipe)}
      nome={perfil.nome?.split(" ")[0] ?? ""}
    />
  );
}
