"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TextoFormatado } from "./texto-formatado";

type Mensagem = { id: string; papel: "user" | "assistant"; conteudo: string };

const SUGESTOES = [
  "Qual a diferença entre pulpite reversível e irreversível?",
  "Como funciona o sistema adesivo autocondicionante?",
  "Quais nervos são anestesiados no bloqueio do alveolar inferior?",
  "Explique a classificação de Black para cavidades.",
];

export function Chat({
  conversaId,
  iniciais,
  restantes: restantesIniciais,
  limite,
}: {
  conversaId: string | null;
  iniciais: Mensagem[];
  restantes: number;
  limite: number;
}) {
  const router = useRouter();
  const [mensagens, setMensagens] = useState(iniciais);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [restantes, setRestantes] = useState(restantesIniciais);
  const conversa = useRef(conversaId);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens]);

  async function enviar(pergunta: string) {
    pergunta = pergunta.trim();
    if (!pergunta || enviando || restantes <= 0) return;
    setErro(null);
    setEnviando(true);
    setTexto("");
    const idResposta = `r-${Date.now()}`;
    setMensagens((m) => [
      ...m,
      { id: `p-${Date.now()}`, papel: "user", conteudo: pergunta },
      { id: idResposta, papel: "assistant", conteudo: "" },
    ]);

    try {
      const resposta = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId: conversa.current, mensagem: pergunta }),
      });
      if (!resposta.ok || !resposta.body) {
        const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
        setMensagens((m) => m.slice(0, -2));
        setTexto(pergunta);
        setErro(corpo?.erro ?? "Não foi possível enviar agora. Tente de novo.");
        if (resposta.status === 429) setRestantes(0);
        return;
      }

      const novaConversa = !conversa.current;
      conversa.current = resposta.headers.get("X-Conversa-Id") ?? conversa.current;
      setRestantes((r) => r - 1);

      const leitor = resposta.body.getReader();
      const decodificador = new TextDecoder();
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        const pedaco = decodificador.decode(value, { stream: true });
        setMensagens((m) => m.map((x) => (x.id === idResposta ? { ...x, conteudo: x.conteudo + pedaco } : x)));
      }
      // Conversa nova: passa a aparecer na lista e na URL.
      if (novaConversa && conversa.current) router.replace(`/aluno/chat?c=${conversa.current}`, { scroll: false });
      else router.refresh();
    } catch {
      setErro("A conexão caiu. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col rounded-2xl border-2 border-tinta bg-white">
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {mensagens.length === 0 && (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-violeta-50 text-violeta-700">
              <Sparkles className="size-6" />
            </div>
            <p className="text-slate-600">Sobre o que você quer saber hoje?</p>
            <div className="mx-auto grid max-w-2xl gap-2 sm:grid-cols-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  disabled={enviando || restantes <= 0}
                  className="rounded-2xl border-2 border-tinta px-3 py-2 text-left text-sm text-slate-700 hover:border-violeta-300 hover:bg-violeta-50 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {mensagens.map((m) =>
          m.papel === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-violeta-700 px-4 py-2.5 text-white">
                {m.conteudo}
              </p>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-lima text-tinta">
                <Sparkles className="size-4" />
              </div>
              <div className="min-w-0 max-w-[85%] rounded-2xl rounded-tl-md bg-slate-50 px-4 py-2.5 text-slate-800">
                {m.conteudo ? (
                  <TextoFormatado texto={m.conteudo} />
                ) : (
                  <span className="inline-flex gap-1 py-2" aria-label="Pensando">
                    <span className="size-2 animate-bounce rounded-full bg-violeta-400 [animation-delay:-0.3s]" />
                    <span className="size-2 animate-bounce rounded-full bg-violeta-400 [animation-delay:-0.15s]" />
                    <span className="size-2 animate-bounce rounded-full bg-violeta-400" />
                  </span>
                )}
              </div>
            </div>
          ),
        )}
        <div ref={fim} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="sticky bottom-0 space-y-2 rounded-b-2xl border-t border-slate-100 bg-white p-3 sm:p-4"
      >
        {erro && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{erro}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar(texto);
              }
            }}
            rows={2}
            maxLength={4000}
            disabled={restantes <= 0}
            placeholder={restantes > 0 ? "Escreva sua dúvida…" : "Você já usou as perguntas de hoje. Volte amanhã!"}
            className="min-h-11 flex-1 resize-none rounded-2xl border-2 border-tinta px-3 py-2.5 text-sm outline-none focus:border-violeta-400 focus:ring-2 focus:ring-violeta-100 disabled:bg-slate-50"
          />
          <button
            disabled={enviando || !texto.trim() || restantes <= 0}
            aria-label="Enviar"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-tinta text-white hover:bg-violeta disabled:opacity-40"
          >
            <ArrowUp className="size-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {restantes} de {limite} perguntas restantes hoje · A IA pode errar: confira com o material e o professor.
        </p>
      </form>
    </div>
  );
}
