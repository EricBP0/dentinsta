import { formatarData } from "@/lib/catalogo";
import type { MensagemFeedback } from "@/lib/feedback";
import { RolarParaFim } from "./conversa-cliente";

function horario(data: string) {
  return `${formatarData(data)} às ${new Date(data).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/**
 * Mensagens de uma conversa de feedback em balões. As de quem está vendo
 * ficam à direita; as do outro lado, à esquerda.
 */
export function Conversa({
  mensagens,
  lado,
  nomeAluno,
  vistaPeloAluno = true,
}: {
  mensagens: MensagemFeedback[];
  /** Quem está vendo: o aluno ou a equipe. */
  lado: "aluno" | "equipe";
  nomeAluno: string;
  /** Para a equipe: o aluno já viu a última resposta? */
  vistaPeloAluno?: boolean;
}) {
  const ultimaDaEquipe = mensagens.findLastIndex((m) => m.da_equipe);
  return (
    <ol className="space-y-4" aria-label="Mensagens da conversa">
      {mensagens.map((m, i) => {
        const minha = (lado === "equipe") === m.da_equipe;
        return (
          <li key={m.id} className={`flex flex-col ${minha ? "items-end" : "items-start"}`}>
            <span className="mb-1 px-1 text-xs text-slate-500">
              <strong className="font-semibold text-slate-700">{m.da_equipe ? "Equipe OdontoLab" : nomeAluno}</strong> ·{" "}
              {horario(m.criado_em)}
            </span>
            <p
              className={`max-w-[85%] rounded-2xl border-2 px-4 py-2.5 text-sm whitespace-pre-wrap sm:max-w-[75%] ${
                minha ? "rounded-br-md border-tinta bg-tinta text-white" : "rounded-bl-md border-tinta bg-white text-slate-800"
              } ${m.da_equipe && !minha ? "border-l-lima border-l-4" : ""}`}
            >
              {m.texto}
            </p>
            {lado === "equipe" && i === ultimaDaEquipe && (
              <span className="mt-1 px-1 text-[11px] text-slate-500">{vistaPeloAluno ? "Visto pelo aluno" : "Ainda não visto pelo aluno"}</span>
            )}
          </li>
        );
      })}
      <RolarParaFim quantidade={mensagens.length} />
    </ol>
  );
}
