"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Recarrega os dados da página a cada `segundos` enquanto estiver montado. */
export function AtualizarPeriodicamente({ segundos, acao }: { segundos: number; acao?: () => Promise<void> }) {
  const router = useRouter();
  useEffect(() => {
    const intervalo = setInterval(async () => {
      if (acao) await acao();
      router.refresh();
    }, segundos * 1000);
    return () => clearInterval(intervalo);
  }, [router, segundos, acao]);
  return null;
}
