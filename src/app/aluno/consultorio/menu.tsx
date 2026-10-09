"use client";

import { CalendarRange, GraduationCap, LayoutGrid, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECOES = [
  { href: "/aluno/consultorio", texto: "Visão geral", icone: LayoutGrid },
  { href: "/aluno/consultorio/agenda", texto: "Agenda", icone: CalendarRange },
  { href: "/aluno/consultorio/pacientes", texto: "Pacientes", icone: Users },
  { href: "/aluno/consultorio/caixa", texto: "Caixa", icone: Wallet },
  { href: "/aluno/consultorio/provas", texto: "Provas", icone: GraduationCap },
];

/** Menu lateral no computador; fileira que rola no celular. */
export function MenuConsultorio() {
  const caminho = usePathname();
  const ativa = SECOES.filter((s) => caminho === s.href || caminho.startsWith(`${s.href}/`)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0]?.href;

  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      {SECOES.map(({ href, texto, icone: Icone }, i) => {
        const atual = href === ativa;
        return (
          <Link
            key={href}
            href={href}
            aria-current={atual ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${
              atual ? "border-tinta bg-tinta text-white" : "border-transparent text-slate-700 hover:border-tinta/20 hover:bg-white"
            }`}
          >
            <Icone className={`size-4 ${atual ? "text-lima" : ""}`} />
            {texto}
            <span className={`rotulo ml-auto hidden text-[10px] lg:inline ${atual ? "text-lima" : "text-slate-400"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
