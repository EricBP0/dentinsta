"use client";

import { Send } from "lucide-react";
import { useActionState, useState } from "react";
import { CATEGORIAS_FEEDBACK, MENSAGEM_MAX, MENSAGEM_MIN } from "@/lib/feedback";
import { botaoEscuro } from "@/components/sistema";
import { enviarFeedback, type EstadoFeedback } from "./actions";

const campo =
  "w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-tinta focus:outline-none";

export function FormularioFeedback() {
  const [estado, acao, enviando] = useActionState<EstadoFeedback, FormData>(enviarFeedback, {});
  // Depois de enviar, a action abre a conversa nova.
  return <Campos estado={estado} acao={acao} enviando={enviando} />;
}

function Campos({ estado, acao, enviando }: { estado: EstadoFeedback; acao: (f: FormData) => void; enviando: boolean }) {
  const [tamanho, setTamanho] = useState(0);
  return (
    <form action={acao} className="space-y-4 rounded-2xl border-2 border-tinta bg-white p-5">
      <div className="space-y-1">
        <h2 className="font-extrabold tracking-tight text-tinta">Mande seu feedback</h2>
        <p className="text-sm text-slate-600">
          Sugestões, erros que encontrou, pedidos de conteúdo ou elogios. Vira uma conversa: a equipe responde e você pode responder de volta.
        </p>
      </div>
      <label className="block space-y-1">
        <span className="rotulo text-[10px] font-semibold text-slate-600">Assunto</span>
        <select name="categoria" defaultValue="sugestao" className={campo}>
          {Object.entries(CATEGORIAS_FEEDBACK).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="rotulo text-[10px] font-semibold text-slate-600">Mensagem</span>
        <textarea
          name="mensagem"
          required
          rows={5}
          minLength={MENSAGEM_MIN}
          maxLength={MENSAGEM_MAX}
          onChange={(e) => setTamanho(e.target.value.length)}
          placeholder="Conte com detalhes. Se for um erro, diga em qual página ou conteúdo aconteceu."
          className={campo}
        />
        <span className="block text-right text-xs text-slate-500">
          {tamanho}/{MENSAGEM_MAX}
        </span>
      </label>
      {estado.erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{estado.erro}</p>}
      <button disabled={enviando} className={botaoEscuro}>
        <Send className="size-4" /> {enviando ? "Enviando…" : "Enviar feedback"}
      </button>
    </form>
  );
}
