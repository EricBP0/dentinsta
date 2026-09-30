"use client";

import { Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { NumeroAnimado } from "@/components/movimento";

const CRITERIOS = [
  { criterio: "Cita o hipoclorito de sódio", obtidos: 4, max: 4 },
  { criterio: "Explica a ação antimicrobiana", obtidos: 3, max: 4 },
  { criterio: "Relaciona com a dissolução de tecido", obtidos: 1.5, max: 2 },
];

/** Exemplo ilustrativo do produto no topo da landing: correção por IA + flashcard. */
export function PreviaProduto() {
  const reduzir = useReducedMotion();
  const [virado, setVirado] = useState(false);

  useEffect(() => {
    if (reduzir) return;
    const intervalo = setInterval(() => setVirado((v) => !v), 3200);
    return () => clearInterval(intervalo);
  }, [reduzir]);

  return (
    <div className="relative mx-auto w-full max-w-md pb-24">
      {/* brilho de fundo */}
      <div aria-hidden className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-teal-200/60 via-coral-claro/25 to-transparent blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-teal-900/5"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700">
            <Sparkles className="size-3.5" /> Correção por IA
          </span>
          <span className="text-xs text-slate-400">exemplo</span>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-900">
          Explique o papel do hipoclorito de sódio na irrigação dos canais radiculares.
        </p>

        <ul className="mt-4 space-y-3">
          {CRITERIOS.map((c, i) => (
            <li key={c.criterio} className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span>{c.criterio}</span>
                <span className="font-medium text-slate-900">
                  {String(c.obtidos).replace(".", ",")}/{c.max}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full rounded-full bg-teal-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.obtidos / c.max) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.6 + i * 0.25, ease: "easeOut" }}
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4">
          <p className="max-w-[60%] text-xs text-slate-600">
            Faltou citar: <span className="text-slate-900">concentração usada na clínica</span>
          </p>
          <p className="text-3xl font-bold text-teal-700">
            <NumeroAnimado valor={8.5} />
          </p>
        </div>
      </motion.div>

      {/* flashcard flutuante */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="absolute bottom-0 right-2 w-52 sm:-right-8"
        style={{ perspective: 800 }}
      >
        <motion.div
          animate={{ rotateY: virado ? 180 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="relative h-28"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className="absolute inset-0 flex flex-col justify-center rounded-xl border border-teal-200 bg-teal-50 p-4 shadow-lg"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide text-teal-700">Flashcard</span>
            <span className="mt-1 text-sm font-medium text-slate-900">O que é a smear layer?</span>
          </div>
          <div
            className="absolute inset-0 flex items-center rounded-xl border border-teal-600 bg-teal-700 p-4 text-sm text-white shadow-lg"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            Camada de detritos que se forma nas paredes do canal durante a instrumentação.
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
