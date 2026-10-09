import { botaoPrimario, botaoSecundario, campo, Selo } from "@/components/admin-ui";
import { exigirEquipe } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import type { Feedback } from "@/lib/ia/rubrica";
import { responderContestacao } from "./actions";
import { CabecalhoPagina } from "@/components/sistema";

type Contestacao = {
  id: string;
  motivo: string;
  status: "aberta" | "aceita" | "recusada";
  resposta_equipe: string | null;
  criado_em: string;
  perfis: { nome: string; email: string };
  respostas: {
    id: string;
    resposta: string;
    nota: number | null;
    feedback: Feedback | null;
    questoes: { enunciado: string };
  };
};

export default async function AdminContestacoes({ searchParams }: PageProps<"/admin/contestacoes">) {
  const { status } = await searchParams;
  const filtro = status === "todas" ? null : "aberta";
  const { supabase } = await exigirEquipe();

  let consulta = supabase
    .from("contestacoes")
    .select(
      "id, motivo, status, resposta_equipe, criado_em, perfis(nome, email), respostas(id, resposta, nota, feedback, questoes(enunciado))",
    )
    .order("criado_em", { ascending: false })
    .limit(100);
  if (filtro) consulta = consulta.eq("status", filtro);
  const { data } = await consulta.overrideTypes<Contestacao[], { merge: false }>();
  const contestacoes = data ?? [];

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · Correção"
        titulo="Contestações de correção"
        descricao="Alunos que discordaram da nota da IA. Use os casos para melhorar gabaritos e rubricas."
      >
        <a href={filtro ? "?status=todas" : "?"} className={botaoSecundario + " px-3 py-2 text-sm"}>
          {filtro ? "Ver todas" : "Só abertas"}
        </a>
      </CabecalhoPagina>

      {contestacoes.length === 0 && <p className="text-sm text-slate-600">Nenhuma contestação {filtro ? "aberta" : ""}.</p>}

      {contestacoes.map((c) => (
        <article key={c.id} className="space-y-4 rounded-2xl border-2 border-tinta bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-slate-600">
              {c.perfis.nome || c.perfis.email} · {formatarData(c.criado_em)}
            </span>
            <Selo status={c.status === "aberta" ? "em_breve" : c.status === "aceita" ? "publicada" : "rascunho"} texto={c.status} />
          </div>

          <div className="space-y-3 text-sm">
            <p className="font-medium text-slate-900">{c.respostas.questoes.enunciado}</p>
            <div className="rounded-lg bg-slate-50 p-3 whitespace-pre-wrap text-slate-800">{c.respostas.resposta}</div>
            <p className="text-slate-700">
              Nota da IA: <strong>{c.respostas.nota ?? "—"}</strong>
              {c.respostas.feedback?.comentario_geral && ` — ${c.respostas.feedback.comentario_geral}`}
            </p>
            <p className="rounded-2xl border-2 border-tinta bg-amber-50 p-3 text-amber-900">
              <strong>Motivo do aluno:</strong> {c.motivo}
            </p>
            {c.resposta_equipe && (
              <p className="text-slate-700">
                <strong>Resposta da equipe:</strong> {c.resposta_equipe}
              </p>
            )}
          </div>

          {c.status === "aberta" && (
            <form action={responderContestacao} className="space-y-3 border-t border-slate-100 pt-4">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="resposta_id" value={c.respostas.id} />
              <textarea name="resposta_equipe" placeholder="Resposta para o aluno" required rows={2} className={campo} />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  name="nota_revisada"
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  placeholder="Nova nota (0–10)"
                  className={`${campo} w-40`}
                />
                <button name="decisao" value="aceita" className={botaoPrimario}>
                  Aceitar e corrigir nota
                </button>
                <button name="decisao" value="recusada" className={botaoSecundario + " px-4 py-2 text-sm"}>
                  Manter nota
                </button>
              </div>
            </form>
          )}
        </article>
      ))}
    </div>
  );
}
