import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { Logo } from "@/components/marca/logo";
import { exigirAfiliado } from "@/lib/afiliado-conta";

/** Área de parceiros: separada do site do aluno, com login próprio. */
export default async function LayoutParceiro({ children }: LayoutProps<"/parceiro">) {
  const { perfil, afiliado } = await exigirAfiliado();
  return (
    <>
      <header className="sticky top-0 z-30 border-b-2 border-tinta bg-tinta/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/parceiro" className="flex items-center gap-2">
            <Logo tamanho="sm" claro />
            <span className="rotulo rounded-md bg-lima px-2 py-0.5 text-[10px] font-bold text-tinta">Parceiros</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-white/70 sm:inline">{afiliado?.nome ?? perfil.email}</span>
            <form action={sair}>
              <button className="rounded-full border-2 border-white/40 px-3 py-1 text-xs font-bold hover:bg-white/10">Sair</button>
            </form>
          </div>
        </div>
      </header>
      <div className="fundo-marca flex flex-1 flex-col">
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {afiliado ? (
            children
          ) : (
            <div className="mx-auto max-w-md space-y-3 rounded-3xl border-2 border-tinta bg-white p-8 text-center">
              <h1 className="text-xl font-extrabold text-tinta">Esta área é para parceiros</h1>
              <p className="text-sm text-slate-600">
                A conta {perfil.email} não está cadastrada como parceira (ou o cadastro está pausado). Fale com a equipe da
                OdontoLab.
              </p>
              <Link href="/aluno" className="text-sm font-semibold text-violeta-700 underline">
                Ir para a área do aluno
              </Link>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
