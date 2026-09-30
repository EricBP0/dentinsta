"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const INTERVALO_MS = 4000;
const LIMITE_MS = 2 * 60 * 1000;

/**
 * Recarrega os dados enquanto a IA corrige. Se passar de 2 minutos, para de
 * atualizar e mostra `seDemorar` (ex.: botão de tentar de novo).
 */
export function AtualizarEnquantoCorrige({ seDemorar }: { seDemorar: ReactNode }) {
  const router = useRouter();
  const [demorou, setDemorou] = useState(false);

  useEffect(() => {
    const intervalo = setInterval(() => router.refresh(), INTERVALO_MS);
    const limite = setTimeout(() => {
      clearInterval(intervalo);
      setDemorou(true);
    }, LIMITE_MS);
    return () => {
      clearInterval(intervalo);
      clearTimeout(limite);
    };
  }, [router]);

  return demorou ? seDemorar : null;
}
