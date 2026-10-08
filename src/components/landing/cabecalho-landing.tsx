"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/marca/logo";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "#recursos", texto: "Recursos" },
  { href: "#novidades", texto: "Novidades" },
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
        rolou || aberto ? "border-b-2 border-tinta bg-white/90 text-tinta backdrop-blur-md" : "bg-transparent text-white"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" aria-label="OdontoLab — início">
          <Logo claro={!(rolou || aberto)} />
        </Link>
        <nav className={`hidden items-center gap-6 text-sm font-medium md:flex ${rolou ? "text-slate-600" : "text-white/85"}`}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={rolou ? "hover:text-tinta" : "hover:text-white"}>
              {l.texto}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="lg" className={rolou ? "" : "text-white hover:bg-white/10 hover:text-white"} asChild>
            <Link href="/entrar">Entrar</Link>
          </Button>
          <Button variant={rolou ? "default" : "destaque"} size="lg" className="rounded-full px-4" asChild>
            <Link href="/assinar">Começar agora</Link>
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon-lg"
          className={`md:hidden ${rolou || aberto ? "" : "text-white hover:bg-white/10 hover:text-white"}`}
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
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setAberto(false)} className="rounded-md px-2 py-2 font-medium text-slate-700 hover:bg-papel">
                  {l.texto}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" asChild>
                  <Link href="/entrar">Entrar</Link>
                </Button>
                <Button variant="destaque" size="lg" asChild>
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
