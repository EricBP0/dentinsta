import Link from "next/link";
import { botaoPerigo, botaoPrimario, botaoSecundario, campo, Selo } from "@/components/admin-ui";
import { exigirEquipe } from "@/lib/auth";
import { NOME_DIFICULDADE } from "@/lib/questoes/questao";
import { alternarStatusQuestao, excluirQuestao } from "./actions";

type LinhaQuestao = {
  id: string;
  tema: string;
  tipo: "objetiva" | "discursiva";
  enunciado: string;
  dificuldade: 1 | 2 | 3;
  status: "rascunho" | "aprovada";
  origem: string;
  fonte: string;
};

export default async function AdminQuestoes({ searchParams }: PageProps<"/admin/questoes">) {
  const { disciplina, status, tipo, geracao } = await searchParams;
  const geracaoId = typeof geracao === "string" ? geracao : null;
  const { supabase } = await exigirEquipe();

  const { data: disciplinas } = await supabase
    .from("disciplinas")
    .select("id, nome")
    .order("ordem")
    .overrideTypes<{ id: string; nome: string }[], { merge: false }>();
  const disciplinaId = geracaoId ? undefined : typeof disciplina === "string" ? disciplina : disciplinas?.[0]?.id;

  let consulta = supabase
    .from("questoes")
    .select("id, tema, tipo, enunciado, dificuldade, status, origem, fonte")
    .order("tema")
    .order("criado_em", { ascending: false })
    .limit(500);
  if (disciplinaId) consulta = consulta.eq("disciplina_id", disciplinaId);
  if (geracaoId) consulta = consulta.eq("geracao_id", geracaoId);
  if (status === "aprovada" || status === "rascunho") consulta = consulta.eq("status", status);
  if (tipo === "objetiva" || tipo === "discursiva") consulta = consulta.eq("tipo", tipo);
  const { data: questoes } = await consulta.overrideTypes<LinhaQuestao[], { merge: false }>();

  const lista = questoes ?? [];
  const aprovadas = lista.filter((q) => q.status === "aprovada").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-tinta">Banco de questões</h1>
          <p className="text-sm text-slate-600">
            {lista.length} questões · {aprovadas} aprovadas (entram nos simulados)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/questoes/gerar?disciplina=${disciplinaId ?? ""}`} className={botaoSecundario + " px-4 py-2 text-sm"}>
            ✨ Gerar com IA
          </Link>
          <Link href="/admin/questoes/geracoes" className={botaoSecundario + " px-4 py-2 text-sm"}>
            Gerações
          </Link>
          <Link href={`/admin/questoes/importar?disciplina=${disciplinaId ?? ""}`} className={botaoSecundario + " px-4 py-2 text-sm"}>
            Importar planilha
          </Link>
          <Link href={`/admin/questoes/nova?disciplina=${disciplinaId ?? ""}`} className={botaoPrimario}>
            Nova questão
          </Link>
        </div>
      </header>

      {geracaoId && (
        <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          Mostrando as questões de uma geração por IA. Abra cada uma para revisar e aprove (clique em
          &quot;Rascunho&quot;) as que estiverem boas. <Link href="/admin/questoes" className="underline">Ver todas</Link>
        </p>
      )}

      <form className="flex flex-wrap gap-2">
        <select name="disciplina" defaultValue={disciplinaId} className={`${campo} w-auto`}>
          {(disciplinas ?? []).map((d) => (
            <option key={d.id} value={d.id}>{d.nome}</option>
          ))}
        </select>
        <select name="tipo" defaultValue={typeof tipo === "string" ? tipo : ""} className={`${campo} w-auto`}>
          <option value="">Todos os tipos</option>
          <option value="objetiva">Objetivas</option>
          <option value="discursiva">Discursivas</option>
        </select>
        <select name="status" defaultValue={typeof status === "string" ? status : ""} className={`${campo} w-auto`}>
          <option value="">Todos os status</option>
          <option value="aprovada">Aprovadas</option>
          <option value="rascunho">Rascunhos</option>
        </select>
        <button className={botaoSecundario + " px-4"}>Filtrar</button>
      </form>

      {!disciplinas?.length && (
        <p className="text-sm text-slate-600">
          Crie uma disciplina antes de cadastrar questões. <Link href="/admin" className="underline">Ir para disciplinas</Link>
        </p>
      )}

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {lista.length === 0 && <li className="p-4 text-sm text-slate-600">Nenhuma questão encontrada.</li>}
        {lista.map((q) => (
          <li key={q.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
            <Link href={`/admin/questoes/${q.id}`} className="min-w-0 flex-1 space-y-1">
              <p className="line-clamp-2 text-sm text-slate-900">{q.enunciado}</p>
              <p className="text-xs text-slate-500">
                {q.tipo === "objetiva" ? "Objetiva" : "Discursiva"} · {NOME_DIFICULDADE[q.dificuldade]}
                {q.tema && ` · ${q.tema}`}
                {q.origem === "ia" && " · gerada por IA"}
              </p>
              {q.fonte && <p className="text-xs text-slate-400">Fonte: {q.fonte}</p>}
            </Link>
            <div className="flex items-center gap-1">
              <form action={alternarStatusQuestao}>
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="status" value={q.status === "aprovada" ? "rascunho" : "aprovada"} />
                <button title="Alternar status">
                  <Selo status={q.status === "aprovada" ? "publicada" : "rascunho"} texto={q.status === "aprovada" ? "Aprovada" : "Rascunho"} />
                </button>
              </form>
              <form action={excluirQuestao}>
                <input type="hidden" name="id" value={q.id} />
                <button className={botaoPerigo}>Excluir</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
