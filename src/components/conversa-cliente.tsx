"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import type { EstadoMensagem } from "@/lib/feedback";
import { MENSAGEM_MAX } from "@/lib/feedback";

/** Leva a tela até a última mensagem ao abrir e quando chega mensagem nova. */
export function RolarParaFim({ quantidade }: { quantidade: number }) {
  const fim = useRef<HTMLLIElement>(null);
  const anterior = useRef(0);
  useEffect(() => {
    if (quantidade !== anterior.current) {
      fim.current?.scrollIntoView({ block: "end", behavior: anterior.current ? "smooth" : "instant" });
      anterior.current = quantidade;
    }
  }, [quantidade]);
  return <li ref={fim} aria-hidden className="h-0" />;
}

/** Campo para responder na conversa. Ctrl/⌘ + Enter também envia. */
export function CaixaMensagem({
  acao,
  feedbackId,
  placeholder = "Escreva sua mensagem",
}: {
  acao: (estado: EstadoMensagem, formData: FormData) => Promise<EstadoMensagem>;
  feedbackId: string;
  placeholder?: string;
}) {
  const [estado, enviar, enviando] = useActionState(acao, {});
  return (
    <form action={enviar} key={estado.enviado ?? 0} className="space-y-2 rounded-2xl border-2 border-tinta bg-white p-3">
      <input type="hidden" name="feedback_id" value={feedbackId} />
      <label className="sr-only" htmlFor="texto-mensagem">
        Mensagem
      </label>
      <textarea
        id="texto-mensagem"
        name="texto"
        required
        rows={3}
        maxLength={MENSAGEM_MAX}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
        }}
        className="w-full resize-y rounded-lg border-0 px-2 py-1 text-sm text-slate-900 focus:ring-0 focus:outline-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <span className="text-xs text-slate-500">{estado.erro ? <span className="text-red-700">{estado.erro}</span> : "Ctrl + Enter para enviar"}</span>
        <button
          disabled={enviando}
          className="inline-flex items-center gap-2 rounded-full bg-tinta px-4 py-2 text-sm font-bold text-white transition hover:bg-violeta disabled:opacity-60"
        >
          <Send className="size-4" /> {enviando ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </form>
  );
}
