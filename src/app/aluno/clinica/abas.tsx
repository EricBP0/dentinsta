"use client";

import { CalendarDays, GraduationCap, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/aluno/clinica", texto: "Dashboard", icone: LayoutDashboard },
  { href: "/aluno/clinica/calendario", texto: "Calendário", icone: CalendarDays },
  { href: "/aluno/clinica/pacientes", texto: "Pacientes", icone: Users },
  { href: "/aluno/clinica/provas", texto: "Provas", icone: GraduationCap },
];

export function AbasClinica() {
  const caminho = usePathname();
  const ativa =
    ABAS.filter((a) => caminho === a.href || caminho.startsWith(`${a.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]
      ?.href ?? (caminho.startsWith("/aluno/clinica/financeiro") ? "/aluno/clinica" : undefined);

  return (
    <nav className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white p-1">
      {ABAS.map(({ href, texto, icone: Icone }) => {
        const atual = href === ativa;
        return (
          <Link
            key={href}
            href={href}
            aria-current={atual ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition sm:flex-row sm:gap-2 sm:text-sm ${
              atual ? "bg-violeta-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icone className="size-4" />
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}
