"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ItemMenu = { href: string; texto: string };

/** Menu com o item da página atual destacado. Rola na horizontal no celular. */
export function Navegacao({ itens, escuro = false }: { itens: ItemMenu[]; escuro?: boolean }) {
  const caminho = usePathname();
  // O item mais específico que casa com a URL é o ativo (ex.: /aluno/simulados ganha de /aluno).
  const ativo = itens
    .filter((i) => caminho === i.href || caminho.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 text-sm [scrollbar-width:none] md:mx-0 md:px-0">
      {itens.map((item) => {
        const atual = item.href === ativo;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={atual ? "page" : undefined}
            className={`shrink-0 rounded-full px-3 py-1.5 transition-colors ${
              escuro
                ? atual
                  ? "bg-lima font-bold text-tinta"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
                : atual
                  ? "bg-tinta font-bold text-white"
                  : "font-medium text-slate-700 hover:bg-white hover:text-tinta"
            }`}
          >
            {item.texto}
          </Link>
        );
      })}
    </nav>
  );
}
