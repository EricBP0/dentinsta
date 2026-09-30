import { LogOut } from "lucide-react";
import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { Logo } from "@/components/marca/logo";
import { Navegacao } from "@/components/navegacao";
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

/** Cabeçalho das áreas logadas: claro para o aluno, escuro (tinta) para o backoffice. */
export function Cabecalho({ perfil, area }: { perfil: Perfil; area: "aluno" | "admin" }) {
  const escuro = area === "admin";
  const itens = MENU[area].filter((item) => !("soAdmin" in item) || perfil.papel === "admin");
  const iniciais = (perfil.nome || perfil.email)
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur ${
        escuro ? "border-white/10 bg-tinta/95 text-white" : "border-slate-200/80 bg-white/90"
      }`}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-4 md:justify-start">
          <Link href={escuro ? "/admin" : "/aluno"} className="flex items-center gap-2">
            <Logo tamanho="sm" claro={escuro} />
            {escuro && (
              <span className="rounded-full bg-coral/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tinta">
                Backoffice
              </span>
            )}
          </Link>
          <div className="flex items-center gap-2 md:hidden">
            <Conta perfil={perfil} escuro={escuro} iniciais={iniciais} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Navegacao itens={itens} escuro={escuro} />
          {perfil.papel !== "aluno" && (
            <Link
              href={escuro ? "/aluno" : "/admin"}
              className={`hidden shrink-0 rounded-full border px-3 py-1.5 text-sm md:inline-block ${
                escuro ? "border-white/20 text-teal-100 hover:bg-white/10" : "border-teal-200 text-teal-800 hover:bg-teal-50"
              }`}
            >
              {escuro ? "Ver como aluno" : "Backoffice"}
            </Link>
          )}
          <div className="hidden items-center gap-2 md:flex">
            <Conta perfil={perfil} escuro={escuro} iniciais={iniciais} />
          </div>
        </div>
      </div>
    </header>
  );
}

function Conta({ perfil, escuro, iniciais }: { perfil: Perfil; escuro: boolean; iniciais: string }) {
  return (
    <>
      <span
        title={perfil.nome || perfil.email}
        className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
          escuro ? "bg-white/15 text-white" : "bg-secondary text-secondary-foreground"
        }`}
      >
        {iniciais}
      </span>
      <form action={sair}>
        <button
          aria-label="Sair"
          title="Sair"
          className={`flex size-8 items-center justify-center rounded-full ${
            escuro ? "text-teal-100 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </>
  );
}
