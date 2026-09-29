import Link from "next/link";
import { notFound } from "next/navigation";
import type { Feedback } from "@/lib/ia/rubrica";
import { Confete, NumeroAnimado } from "@/components/movimento";
import { exigirLogin } from "@/lib/auth";
import type { Alternativa } from "@/lib/questoes/questao";
import { contestar, enviarSimulado, tentarCorrigirDeNovo } from "../actions";
import { AtualizarEnquantoCorrige } from "./atualizar";

type Simulado = {
  id: string;
  status: "em_andamento" | "finalizado";
  nota: number | null;
  disciplinas: { nome: string };
};

type QuestaoProva = {
  ordem: number;
  questoes: { id: string; tipo: "objetiva" | "discursiva"; tema: string; enunciado: string; alternativas: Alternativa[] };
};

type LinhaResultado = {
  questao_id: string;
  ordem: number;
  tipo: "objetiva" | "discursiva";
  tema: string;
  enunciado: string;
  alternativas: Alternativa[];
  gabarito: string;
  explicacao: string;
  resposta_id: string;
  resposta: string;
  correta: boolean | null;
  nota: number | null;
  feedback: Feedback | null;
  corrigido_por: "auto" | "ia" | "professor" | null;
  status_correcao: "pendente" | "corrigida" | "sem_cota" | "erro";
  contestacao: "aberta" | "aceita" | "recusada" | null;
  resposta_equipe: string | null;
};

export default async function PaginaSimulado({ params }: PageProps<"/aluno/simulados/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirLogin();

  const { data: simulado } = await supabase
    .from("simulados")
    .select("id, status, nota, disciplinas(nome)")
    .eq("id", id)
    .maybeSingle<Simulado>();
  if (!simulado) notFound();

  return (
    <div className="space-y-6">
      <Link href="/aluno/simulados" className="text-sm text-slate-600 hover:text-slate-900">
        ← Simulados
      </Link>
      {simulado.status === "em_andamento" ? <Prova simulado={simulado} /> : <Resultado simulado={simulado} />}
    </div>
  );
}

async function Prova({ simulado }: { simulado: Simulado }) {
  const { supabase } = await exigirLogin();
  const { data } = await supabase
    .from("simulado_questoes")
    .select("ordem, questoes(id, tipo, tema, enunciado, alternativas)")
    .eq("simulado_id", simulado.id)
    .order("ordem")
    .overrideTypes<QuestaoProva[], { merge: false }>();
  const questoes = data ?? [];

  return (
    <form action={enviarSimulado} className="space-y-6">
      <input type="hidden" name="simulado_id" value={simulado.id} />
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Simulado · {simulado.disciplinas.nome}</h1>
        <p className="text-sm text-slate-600">{questoes.length} questões. Responda e envie no final.</p>
      </header>

      {questoes.map(({ ordem, questoes: q }) => (
        <fieldset key={q.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <legend className="sr-only">Questão {ordem}</legend>
          <p className="text-xs font-medium text-slate-500">
            Questão {ordem} · {q.tipo === "objetiva" ? "Objetiva" : "Discursiva"}
            {q.tema && ` · ${q.tema}`}
          </p>
          <p className="whitespace-pre-wrap text-slate-900">{q.enunciado}</p>
          {q.tipo === "objetiva" ? (
            <div className="space-y-2">
              {q.alternativas.map((a) => (
                <label key={a.letra} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
                  <input type="radio" name={`q_${q.id}`} value={a.letra} className="mt-1" />
                  <span className="text-sm text-slate-800">
                    <strong>{a.letra})</strong> {a.texto}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              name={`q_${q.id}`}
              rows={6}
              maxLength={3000}
              placeholder="Escreva sua resposta (até 3.000 caracteres)"
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
            />
          )}
        </fieldset>
      ))}

      <button className="w-full rounded-lg bg-teal-700 py-3 font-medium text-white hover:bg-teal-800 sm:w-auto sm:px-8">
        Enviar respostas
      </button>
    </form>
  );
}

async function Resultado({ simulado }: { simulado: Simulado }) {
  const { supabase } = await exigirLogin();
  const { data } = await supabase.rpc("resultado_simulado", { p_simulado_id: simulado.id });
  const linhas = (data ?? []) as LinhaResultado[];

  const corrigindo = linhas.some((l) => l.status_correcao === "pendente");
  const comErro = linhas.some((l) => l.status_correcao === "erro");
  const acertos = linhas.filter((l) => l.correta).length;
  const objetivas = linhas.filter((l) => l.tipo === "objetiva").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resultado · {simulado.disciplinas.nome}</h1>
          {objetivas > 0 && (
            <p className="text-sm text-slate-600">
              Objetivas: {acertos} de {objetivas} corretas
            </p>
          )}
        </div>
        <div className="text-right">
          {simulado.nota !== null ? (
            <div className="relative">
              {/* Comemoração para nota a partir de 7 */}
              {Number(simulado.nota) >= 7 && <Confete />}
              <p className={`text-4xl font-bold ${Number(simulado.nota) >= 6 ? "text-teal-700" : "text-red-600"}`}>
                <NumeroAnimado valor={Number(simulado.nota)} />
              </p>
              {Number(simulado.nota) >= 7 && <p className="text-xs font-medium text-teal-700">Mandou bem!</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nota final após a correção</p>
          )}
        </div>
      </header>

      {corrigindo && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          A IA está corrigindo suas respostas discursivas. Esta página atualiza sozinha.
          <AtualizarEnquantoCorrige
            seDemorar={
              <form action={tentarCorrigirDeNovo} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="simulado_id" value={simulado.id} />
                Está demorando mais que o normal.
                <button className="rounded-md border border-sky-300 bg-white px-3 py-1">Tentar de novo</button>
              </form>
            }
          />
        </div>
      )}
      {comErro && !corrigindo && (
        <form action={tentarCorrigirDeNovo} className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <input type="hidden" name="simulado_id" value={simulado.id} />
          Não conseguimos corrigir alguma resposta agora.
          <button className="rounded-md border border-red-300 bg-white px-3 py-1">Tentar de novo</button>
        </form>
      )}

      {linhas.map((l) => (
        <article key={l.questao_id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium text-slate-500">
              Questão {l.ordem} · {l.tipo === "objetiva" ? "Objetiva" : "Discursiva"}
              {l.tema && ` · ${l.tema}`}
            </p>
            <SeloNota linha={l} />
          </div>
          <p className="whitespace-pre-wrap text-slate-900">{l.enunciado}</p>

          {l.tipo === "objetiva" ? (
            <ul className="space-y-2">
              {l.alternativas.map((a) => {
                const escolhida = a.letra === l.resposta.toUpperCase();
                const certa = a.letra === l.gabarito.toUpperCase();
                return (
                  <li
                    key={a.letra}
                    className={`rounded-lg border p-3 text-sm ${
                      certa ? "border-teal-500 bg-teal-50" : escolhida ? "border-red-400 bg-red-50" : "border-slate-200"
                    }`}
                  >
                    <strong>{a.letra})</strong> {a.texto}
                    {certa && <span className="ml-2 text-xs font-medium text-teal-700">correta</span>}
                    {escolhida && !certa && <span className="ml-2 text-xs font-medium text-red-600">sua resposta</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Discursiva linha={l} simuladoId={simulado.id} />
          )}

          {l.explicacao && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <strong>Explicação:</strong> {l.explicacao}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function SeloNota({ linha }: { linha: LinhaResultado }) {
  if (linha.status_correcao === "pendente") return <span className="text-xs text-sky-700">Corrigindo…</span>;
  if (linha.status_correcao === "sem_cota") return <span className="text-xs text-amber-700">Sem correção</span>;
  if (linha.status_correcao === "erro") return <span className="text-xs text-red-600">Erro na correção</span>;
  const nota = Number(linha.nota);
  return <span className={`text-sm font-bold ${nota >= 6 ? "text-teal-700" : "text-red-600"}`}>{nota.toFixed(1)}</span>;
}

function Discursiva({ linha, simuladoId }: { linha: LinhaResultado; simuladoId: string }) {
  const feedback = linha.feedback;
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="mb-1 font-medium text-slate-700">Sua resposta</p>
        <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-800">{linha.resposta || "(em branco)"}</div>
      </div>

      {linha.status_correcao === "sem_cota" && (
        <p className="text-amber-800">Você atingiu a cota mensal de correções por IA (ou seu acesso à IA terminou).</p>
      )}

      {feedback && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <p className="font-medium text-slate-900">Correção{linha.corrigido_por === "professor" ? " revisada pelo professor" : " por IA"}</p>
          <ul className="space-y-2">
            {feedback.criterios.map((c) => (
              <li key={c.criterio}>
                <p className="text-slate-800">
                  <strong>
                    {c.pontos_obtidos}/{c.pontos_max}
                  </strong>{" "}
                  · {c.criterio}
                </p>
                {c.comentario && <p className="text-slate-600">{c.comentario}</p>}
              </li>
            ))}
          </ul>
          {feedback.comentario_geral && <p className="text-slate-700">{feedback.comentario_geral}</p>}
          {feedback.faltou.length > 0 && (
            <p className="text-slate-700">
              <strong>Faltou citar:</strong> {feedback.faltou.join("; ")}
            </p>
          )}
        </div>
      )}

      {linha.status_correcao === "corrigida" && linha.gabarito && (
        <details className="rounded-lg bg-slate-50 p-3">
          <summary className="cursor-pointer font-medium text-slate-700">Resposta esperada</summary>
          <p className="mt-2 whitespace-pre-wrap text-slate-700">{linha.gabarito}</p>
        </details>
      )}

      {linha.corrigido_por === "ia" && !linha.contestacao && (
        <details>
          <summary className="cursor-pointer text-slate-500 hover:text-slate-800">Discorda da correção?</summary>
          <form action={contestar} className="mt-2 space-y-2">
            <input type="hidden" name="resposta_id" value={linha.resposta_id} />
            <input type="hidden" name="simulado_id" value={simuladoId} />
            <textarea
              name="motivo"
              required
              minLength={5}
              maxLength={2000}
              rows={3}
              placeholder="Explique por que a nota deveria ser diferente"
              className="w-full rounded-lg border border-slate-300 p-2 focus:border-teal-600 focus:outline-none"
            />
            <button className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50">Enviar para o professor</button>
          </form>
        </details>
      )}
      {linha.contestacao && (
        <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
          Contestação {linha.contestacao === "aberta" ? "enviada — aguardando o professor" : linha.contestacao}.
          {linha.resposta_equipe && ` Resposta: ${linha.resposta_equipe}`}
        </p>
      )}
    </div>
  );
}
