import Link from "next/link";
import { obterSessao } from "@/lib/auth";
import { FormularioNovaSenha } from "./formulario";

/** Aberta pelo link de "esqueci minha senha" (que já deixa o aluno logado). */
export default async function RedefinirSenha() {
  const { perfil } = await obterSessao();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <Link href="/" className="text-2xl font-bold text-teal-800">
        dentinsta
      </Link>
      {perfil ? (
        <FormularioNovaSenha />
      ) : (
        <div className="max-w-sm space-y-3 text-center">
          <p className="text-slate-700">Esse link expirou. Peça um novo na tela de entrar.</p>
          <Link href="/entrar" className="text-sm font-medium text-teal-700 underline">
            Ir para entrar
          </Link>
        </div>
      )}
    </main>
  );
}
