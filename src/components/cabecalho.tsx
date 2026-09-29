import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import type { Perfil } from "@/lib/tipos";

export function Cabecalho({ perfil, area }: { perfil: Perfil; area: "aluno" | "admin" }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href={area === "admin" ? "/admin" : "/aluno"} className="text-lg font-bold text-teal-800">
            dentinsta{area === "admin" && <span className="ml-2 text-sm font-normal text-slate-500">backoffice</span>}
          </Link>
          {perfil.papel !== "aluno" && (
            <Link
              href={area === "admin" ? "/aluno" : "/admin"}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              {area === "admin" ? "Ver como aluno" : "Backoffice"}
            </Link>
          )}
        </div>
        <form action={sair} className="flex items-center gap-3 text-sm text-slate-600">
          <span className="hidden sm:inline">{perfil.nome || perfil.email}</span>
          <button className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50">Sair</button>
        </form>
      </div>
    </header>
  );
}
