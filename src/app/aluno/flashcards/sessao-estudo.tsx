"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Confete } from "@/components/movimento";
import { rotuloIntervalo, type Avaliacao } from "@/lib/flashcards/repeticao";
import type { CardSessao } from "@/lib/flashcards/sessao";
import { registrarRevisao } from "./actions";

const BOTOES: { avaliacao: Avaliacao; texto: string; tecla: string; cor: string }[] = [
  { avaliacao: "errei", texto: "Errei", tecla: "1", cor: "border-red-300 bg-red-50 text-red-800 hover:bg-red-100" },
  { avaliacao: "dificil", texto: "Difícil", tecla: "2", cor: "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" },
  { avaliacao: "bom", texto: "Bom", tecla: "3", cor: "border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100" },
  { avaliacao: "facil", texto: "Fácil", tecla: "4", cor: "border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100" },
];

export function SessaoEstudo({ cards, nomesDecks }: { cards: CardSessao[]; nomesDecks?: Record<string, string> }) {
  const router = useRouter();
  const [fila, setFila] = useState(cards);
  const [mostrandoVerso, setMostrandoVerso] = useState(false);
  const [revisados, setRevisados] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [deckConcluido, setDeckConcluido] = useState(false);
  const [salvando, iniciar] = useTransition();
  const atual = fila[0];

  const avaliar = useCallback(
    (avaliacao: Avaliacao) => {
      if (!atual || salvando) return;
      iniciar(async () => {
        const resultado = await registrarRevisao(atual.id, avaliacao);
        if ("erro" in resultado) {
          setErro(resultado.erro);
          return;
        }
        setErro(null);
        if (resultado.deckConcluido) setDeckConcluido(true);
        setRevisados((n) => n + 1);
        setMostrandoVerso(false);
        // Card errado volta no fim da fila desta sessão.
        setFila(([, ...resto]) =>
          avaliacao === "errei" ? [...resto, { ...atual, novo: false, estado: resultado.estado }] : resto,
        );
      });
    },
    [atual, salvando],
  );

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ["TEXTAREA", "INPUT"].includes(e.target.tagName)) return;
      if (!mostrandoVerso && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setMostrandoVerso(true);
      } else if (mostrandoVerso) {
        const botao = BOTOES.find((b) => b.tecla === e.key);
        if (botao) avaliar(botao.avaliacao);
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [mostrandoVerso, avaliar]);

  if (!atual) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative space-y-3 rounded-xl border border-teal-200 bg-teal-50 p-8 text-center"
      >
        {revisados > 0 && <Confete />}
        <p className="text-2xl">🎉</p>
        <p className="font-medium text-teal-900">
          {revisados > 0 ? `Sessão concluída: ${revisados} revisões.` : "Nada para revisar agora."}
        </p>
        {deckConcluido && <p className="text-sm text-teal-800">Você viu todos os cards deste deck — item concluído!</p>}
        <p className="text-sm text-teal-800">Os cards voltam no dia certo para fixar na memória.</p>
        <button onClick={() => router.refresh()} className="text-sm font-medium text-teal-700 underline">
          Atualizar
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-xs text-slate-500">
        <span>
          {fila.length} {fila.length === 1 ? "restante" : "restantes"}
          {atual.novo && <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">novo</span>}
        </span>
        {nomesDecks?.[atual.item_id] && <span>{nomesDecks[atual.item_id]}</span>}
      </div>

      <div style={{ perspective: 1200 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            // A chave muda a cada revisão: o card sai para a esquerda e o próximo entra pela direita.
            key={`${atual.id}-${revisados}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              type="button"
              onClick={() => setMostrandoVerso(true)}
              disabled={mostrandoVerso}
              aria-label={mostrandoVerso ? "Resposta" : "Mostrar resposta"}
              animate={{ rotateY: mostrandoVerso ? 180 : 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="grid w-full text-left [&>*]:[grid-area:1/1]"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* frente */}
              <div
                className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"
                style={{ backfaceVisibility: "hidden" }}
              >
                <p className="whitespace-pre-wrap text-center text-lg font-medium text-slate-900">{atual.frente}</p>
              </div>
              {/* verso */}
              <div
                className="flex min-h-64 flex-col justify-center gap-4 rounded-2xl border border-teal-200 bg-gradient-to-br from-white to-teal-50 p-6 shadow-sm sm:p-10"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <p className="whitespace-pre-wrap text-center text-sm text-slate-500">{atual.frente}</p>
                <p className="whitespace-pre-wrap text-center text-lg text-slate-900">{atual.verso}</p>
                {atual.imagem_url && (
                  // eslint-disable-next-line @next/next/no-img-element -- imagem de origem externa configurável
                  <img src={atual.imagem_url} alt="" className="mx-auto max-h-80 rounded-lg" />
                )}
              </div>
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>

      {mostrandoVerso ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BOTOES.map((b) => (
            <button
              key={b.avaliacao}
              onClick={() => avaliar(b.avaliacao)}
              disabled={salvando}
              className={`rounded-lg border px-3 py-3 text-sm font-medium disabled:opacity-60 ${b.cor}`}
            >
              {b.texto}
              <span className="block text-xs font-normal opacity-75">{rotuloIntervalo(atual.estado, b.avaliacao)}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setMostrandoVerso(true)}
          className="w-full rounded-lg bg-teal-700 py-3 font-medium text-white hover:bg-teal-800"
        >
          Mostrar resposta
        </button>
      )}
      {erro && <p className="text-center text-sm text-red-600">{erro}</p>}
      <p className="hidden text-center text-xs text-slate-400 sm:block">
        Toque no card ou aperte espaço para ver a resposta · 1 a 4 avaliam
      </p>
    </div>
  );
}
