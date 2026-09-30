import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import type { Perfil } from "@/lib/tipos";

const MENU = {
  aluno: [
    { href: "/aluno", texto: "Painel" },
    { href: "/aluno/disciplinas", texto: "Disciplinas" },
    { href: "/aluno/simulados", texto: "Simulados" },
    { href: "/aluno/flashcards", texto: "Flashcards" },
    { href: "/aluno/certificados", texto: "Certificados" },
  ],
  admin: [
    { href: "/admin", texto: "Disciplinas" },
    { href: "/admin/questoes", texto: "Questões" },
    { href: "/admin/contestacoes", texto: "Contestações" },
    { href: "/admin/vendas", texto: "Vendas", soAdmin: true },
  ],
};

export function Cabecalho({ perfil, area }: { perfil: Perfil; area: "aluno" | "admin" }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href={area === "admin" ? "/admin" : "/aluno"} className="text-lg font-bold text-teal-800">
            dentinsta{area === "admin" && <span className="ml-2 text-sm font-normal text-slate-500">backoffice</span>}
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            {MENU[area]
              .filter((item) => !("soAdmin" in item) || perfil.papel === "admin")
              .map((item) => (
              <Link key={item.href} href={item.href} className="text-slate-600 hover:text-slate-900">
                {item.texto}
              </Link>
            ))}
            {perfil.papel !== "aluno" && (
              <Link href={area === "admin" ? "/aluno" : "/admin"} className="text-teal-700 hover:text-teal-900">
                {area === "admin" ? "Ver como aluno" : "Backoffice"}
              </Link>
            )}
          </nav>
        </div>
        <form action={sair} className="flex items-center gap-3 text-sm text-slate-600">
          <span className="hidden sm:inline">{perfil.nome || perfil.email}</span>
          <button className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50">Sair</button>
        </form>
      </div>
    </header>
  );
}
