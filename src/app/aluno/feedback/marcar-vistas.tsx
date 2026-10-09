"use client";

import { useEffect, useState } from "react";
import { marcarRespostasVistas } from "./actions";

/** Ao abrir a página, marca as respostas novas como vistas (some o aviso do menu). */
export function MarcarVistas() {
  useEffect(() => {
    marcarRespostasVistas().catch(() => {});
  }, []);
  return null;
}

/**
 * Selo "Nova resposta". Guarda o estado da primeira renderização: continua
 * aparecendo mesmo depois que a página recarrega com a resposta já vista.
 */
export function SeloNovaResposta({ nova }: { nova: boolean }) {
  const [mostrar] = useState(nova);
  if (!mostrar) return null;
  return <span className="rounded-full bg-lima px-2 py-0.5 text-xs font-bold text-tinta">Nova resposta</span>;
}
