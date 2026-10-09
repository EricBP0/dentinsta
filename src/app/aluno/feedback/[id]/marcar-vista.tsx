"use client";

import { useEffect } from "react";
import { marcarConversaVista } from "../actions";

/** Ao abrir (ou receber resposta nova), marca a conversa como vista. */
export function MarcarVista({ id, ultima }: { id: string; ultima: string }) {
  useEffect(() => {
    marcarConversaVista(id).catch(() => {});
  }, [id, ultima]);
  return null;
}
