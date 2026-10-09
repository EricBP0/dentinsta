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
    { href: "/aluno/chat", texto: "Chat IA" },
    { href: "/aluno/consultorio", texto: "Consultório" },
    { href: "/aluno/certificados", texto: "Certificados" },
    { href: "/aluno/feedback", texto: "Feedback" },
  ],
  admin: [
    { href: "/admin", texto: "Disciplinas" },
    { href: "/admin/questoes", texto: "Questões" },
    { href: "/admin/contestacoes", texto: "Contestações" },
    { href: "/admin/feedbacks", texto: "Feedbacks" },
    { href: "/admin/vendas", texto: "Vendas", soAdmin: true },
  ],
};

/**
 * Cabeçalho das áreas logadas: claro para o aluno, escuro (tinta) para o backoffice.
 * `avisos` põe um número ao lado do item do menu (ex.: respostas novas).
 */
export function Cabecalho({
  perfil,
  area,
  avisos = {},
}: {
  perfil: Perfil;
  area: "aluno" | "admin";
  avisos?: Record<string, number>;
}) {
  const escuro = area === "admin";
  const itens = MENU[area]
    .filter((item) => !("soAdmin" in item) || perfil.papel === "admin")
    .map((item) => ({ href: item.href, texto: item.texto, aviso: avisos[item.href] }));
  const iniciais = (perfil.nome || perfil.email)
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <header
      className={`sticky top-0 z-30 border-b-2 backdrop-blur ${
        escuro ? "border-tinta bg-tinta/95 text-white" : "border-tinta bg-papel/95"
      }`}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-4 md:justify-start">
          <Link href={escuro ? "/admin" : "/aluno"} className="flex items-center gap-2">
            <Logo tamanho="sm" claro={escuro} />
            {escuro && (
              <span className="rotulo rounded-md bg-lima px-2 py-0.5 text-[10px] font-bold text-tinta">
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
              className={`hidden shrink-0 rounded-full border-2 px-3 py-1 text-sm font-semibold md:inline-block ${
                escuro ? "border-lima text-lima hover:bg-lima hover:text-tinta" : "border-tinta text-tinta hover:bg-lima"
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
        className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
          escuro ? "border-2 border-lima bg-tinta text-lima" : "border-2 border-tinta bg-lima text-tinta"
        }`}
      >
        {iniciais}
      </span>
      <form action={sair}>
        <button
          aria-label="Sair"
          title="Sair"
          className={`flex size-8 items-center justify-center rounded-full ${
            escuro ? "text-violeta-100 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </>
  );
}
