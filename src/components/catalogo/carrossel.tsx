"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fileira com rolagem horizontal e setas (as setas somem quando não há para onde rolar). */
export function Carrossel({ children, rotulo }: { children: ReactNode; rotulo: string }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [pode, setPode] = useState({ voltar: false, avancar: false });

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const medir = () =>
      setPode({ voltar: el.scrollLeft > 4, avancar: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => {
      el.removeEventListener("scroll", medir);
      observador.disconnect();
    };
  }, []);

  const rolar = (direcao: 1 | -1) => {
    const el = trilho.current;
    if (el) el.scrollBy({ left: direcao * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const seta =
    "absolute top-[38%] z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-800 shadow-md transition hover:bg-white sm:grid";

  return (
    <div className="relative">
      <div
        ref={trilho}
        role="list"
        aria-label={rotulo}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {pode.voltar && (
        <button type="button" onClick={() => rolar(-1)} aria-label="Voltar" className={`${seta} -left-4`}>
          <ChevronLeft className="size-5" />
        </button>
      )}
      {pode.avancar && (
        <button type="button" onClick={() => rolar(1)} aria-label="Avançar" className={`${seta} -right-4`}>
          <ChevronRight className="size-5" />
        </button>
      )}
    </div>
  );
}
