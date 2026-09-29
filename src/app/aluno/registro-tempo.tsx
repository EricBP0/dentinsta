"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { registrarTempo } from "./tempo-actions";

// Só conta tempo em páginas de estudo (não no painel nem em listagens de compra).
const PAGINAS_DE_ESTUDO = /^\/aluno\/(itens|disciplinas|simulados|flashcards)/;
const ENVIO_MS = 60_000;
const INATIVO_MS = 2 * 60_000;

/**
 * Mede o tempo de estudo ativo: aba visível e alguma interação (tecla, clique,
 * rolagem, toque) nos últimos 2 minutos. Envia o acumulado uma vez por minuto
 * e ao sair da aba.
 */
export function RegistroTempo() {
  const caminho = usePathname();
  const acumulado = useRef(0);
  const ultimaInteracao = useRef(0);

  useEffect(() => {
    if (!PAGINAS_DE_ESTUDO.test(caminho)) return;

    // Abrir a página conta como interação.
    ultimaInteracao.current = Date.now();
    const interagiu = () => (ultimaInteracao.current = Date.now());
    const eventos = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    eventos.forEach((e) => window.addEventListener(e, interagiu, { passive: true }));

    const enviar = () => {
      const segundos = Math.floor(acumulado.current);
      if (segundos >= 5) {
        acumulado.current -= segundos;
        registrarTempo(segundos).catch(() => {
          // Falhou: devolve para o próximo envio.
          acumulado.current += segundos;
        });
      }
    };

    const contador = setInterval(() => {
      const ativo = document.visibilityState === "visible" && Date.now() - ultimaInteracao.current < INATIVO_MS;
      if (ativo) acumulado.current += 1;
    }, 1000);
    const envio = setInterval(enviar, ENVIO_MS);
    const aoEsconder = () => document.visibilityState === "hidden" && enviar();
    document.addEventListener("visibilitychange", aoEsconder);

    return () => {
      enviar();
      clearInterval(contador);
      clearInterval(envio);
      document.removeEventListener("visibilitychange", aoEsconder);
      eventos.forEach((e) => window.removeEventListener(e, interagiu));
    };
  }, [caminho]);

  return null;
}
