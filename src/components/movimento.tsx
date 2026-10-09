"use client";

import { animate, motion, MotionConfig, useInView, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Envolve as páginas animadas. reducedMotion="user" desliga movimentos para
 * quem ativou "reduzir movimento" no sistema (acessibilidade).
 */
export function Movimento({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Aparece suavemente ao entrar na tela. */
export function Surgir({
  children,
  atraso = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  atraso?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: atraso, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

/** Lista em que os filhos aparecem em sequência (use com <SurgirItem>). */
export function SurgirLista({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="oculto"
      whileInView="visivel"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ visivel: { transition: { staggerChildren: 0.07 } } }}
    >
      {children}
    </motion.div>
  );
}

export function SurgirItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        oculto: { opacity: 0, y: 14 },
        visivel: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Número que conta até o valor quando aparece na tela (ex.: nota do simulado). */
export function NumeroAnimado({ valor, casas = 1, className }: { valor: number; casas?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visivel = useInView(ref, { once: true });
  const reduzir = useReducedMotion();
  const [atual, setAtual] = useState(reduzir ? valor : 0);

  useEffect(() => {
    if (!visivel || reduzir) return;
    const controle = animate(0, valor, { duration: 1.1, ease: "easeOut", onUpdate: setAtual });
    return () => controle.stop();
  }, [visivel, reduzir, valor]);

  return (
    <span ref={ref} className={className}>
      {(reduzir ? valor : atual).toFixed(casas).replace(".", ",")}
    </span>
  );
}

/** Barra de progresso que preenche com animação. */
export function BarraAnimada({ porcentagem, className }: { porcentagem: number; className?: string }) {
  return (
    <div className={`h-3 overflow-hidden rounded-full border-2 border-tinta bg-white ${className ?? ""}`}>
      <motion.div
        className="h-full bg-violeta"
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.min(Math.max(porcentagem, 0), 100)}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

// Confete nas cores da marca: Violeta, Verde-limão, Preto e Lilás.
const CORES_CONFETE = ["#5a3fe0", "#c8f250", "#12101f", "#cfc6ff", "#b4dc3c", "#8b78f5"];

/** "Aleatório" determinístico (0 a 1): o componente continua puro entre renderizações. */
function pseudoAleatorio(indice: number, semente: number) {
  const x = Math.sin(indice * 12.9898 + semente * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Comemoração leve (sem biblioteca extra). Não aparece para quem reduz movimento. */
export function Confete({ quantidade = 28 }: { quantidade?: number }) {
  const reduzir = useReducedMotion();
  const pecas = useMemo(
    () =>
      Array.from({ length: quantidade }, (_, i) => ({
        id: i,
        x: (pseudoAleatorio(i, 1) - 0.5) * 360,
        y: -(120 + pseudoAleatorio(i, 2) * 180),
        rotacao: pseudoAleatorio(i, 3) * 540 - 270,
        cor: CORES_CONFETE[i % CORES_CONFETE.length],
        atraso: pseudoAleatorio(i, 4) * 0.15,
        largura: 6 + pseudoAleatorio(i, 5) * 6,
      })),
    [quantidade],
  );
  if (reduzir) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center">
      {pecas.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block rounded-sm"
          style={{ width: p.largura, height: p.largura * 0.5, backgroundColor: p.cor }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 260], opacity: [1, 1, 0], rotate: p.rotacao }}
          transition={{ duration: 1.6, delay: p.atraso, ease: "easeOut", times: [0, 0.4, 1] }}
        />
      ))}
    </div>
  );
}
