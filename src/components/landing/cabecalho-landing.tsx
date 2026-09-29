"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "#recursos", texto: "Recursos" },
  { href: "#como-funciona", texto: "Como funciona" },
  { href: "#preco", texto: "Preço" },
  { href: "#duvidas", texto: "Dúvidas" },
];

export function CabecalhoLanding() {
  const { scrollY } = useScroll();
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setRolou(y > 12));

  return (
    <header
      className={`sticky top-0 z-40 transition-colors ${
        rolou || aberto ? "border-b border-slate-200/80 bg-white/80 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight text-teal-800">
          dentinsta
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-slate-900">
              {l.texto}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="lg" asChild>
            <Link href="/entrar">Entrar</Link>
          </Button>
          <Button size="lg" asChild>
            <Link href="/assinar">Começar agora</Link>
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon-lg"
          className="md:hidden"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          onClick={() => setAberto((a) => !a)}
        >
          {aberto ? <X /> : <Menu />}
        </Button>
      </div>

      <AnimatePresence>
        {aberto && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100 md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setAberto(false)} className="rounded-md px-2 py-2 text-slate-700 hover:bg-slate-50">
                  {l.texto}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" asChild>
                  <Link href="/entrar">Entrar</Link>
                </Button>
                <Button size="lg" asChild>
                  <Link href="/assinar">Começar</Link>
                </Button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
