import { botaoPrimario, botaoSecundario, campo, Selo } from "@/components/admin-ui";
import { exigirEquipe } from "@/lib/auth";
import { faixa, lerPagina, termoIlike, textoParam, totalDePaginas } from "@/lib/listagem";
import { BarraBusca, FiltroSelect, Paginacao, ResumoLista } from "@/components/listagem";
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

const POR_PAGINA = 10;
const STATUS: [string, string][] = [
  ["aberta", "Abertas"],
  ["aceita", "Aceitas"],
  ["recusada", "Recusadas"],
  ["todas", "Todas"],
];

export default async function AdminContestacoes({ searchParams }: PageProps<"/admin/contestacoes">) {
  const params = await searchParams;
  const status = STATUS.some(([v]) => v === textoParam(params.status)) ? textoParam(params.status) : "aberta";
  const filtro = status === "todas" ? null : status;
  const busca = textoParam(params.q);
  const termo = termoIlike(busca);
  const paginaAtual = lerPagina(params.pagina);
  const { supabase } = await exigirEquipe();

  // Com busca, o join com perfis vira "inner" para filtrar pelo aluno.
  let consulta = supabase
    .from("contestacoes")
    .select(
      `id, motivo, status, resposta_equipe, criado_em, perfis${termo ? "!inner" : ""}(nome, email), respostas(id, resposta, nota, feedback, questoes(enunciado))`,
      { count: "exact" },
    )
    .order("criado_em", { ascending: false })
    .range(...faixa(paginaAtual, POR_PAGINA));
  if (filtro) consulta = consulta.eq("status", filtro);
  if (termo) consulta = consulta.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%`, { referencedTable: "perfis" });
  const { data, count } = await consulta.overrideTypes<Contestacao[], { merge: false }>();
  const contestacoes = data ?? [];
  const filtros = { q: busca, status: status === "aberta" ? null : status };

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · Correção"
        titulo="Contestações de correção"
        descricao="Alunos que discordaram da nota da IA. Use os casos para melhorar gabaritos e rubricas."
      />

      <section className="space-y-3">
        <BarraBusca acao="/admin/contestacoes" busca={busca} placeholder="Buscar aluno por nome ou e-mail" limpar={Boolean(busca || filtros.status)}>
          <FiltroSelect nome="status" valor={status} rotulo="Status" opcoes={STATUS} />
        </BarraBusca>
        <ResumoLista pagina={paginaAtual} porPagina={POR_PAGINA} total={count ?? 0} nome={["contestação", "contestações"]} />
      </section>

      {contestacoes.length === 0 && (
        <p className="text-sm text-slate-600">
          {busca ? "Nenhuma contestação encontrada com essa busca." : `Nenhuma contestação${filtro ? ` ${filtro}` : ""}.`}
        </p>
      )}

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

      <Paginacao acao="/admin/contestacoes" pagina={paginaAtual} totalPaginas={totalDePaginas(count, POR_PAGINA)} params={filtros} />
    </div>
  );
}
