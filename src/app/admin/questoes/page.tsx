import Link from "next/link";
import { botaoPerigo, botaoSecundario, Selo } from "@/components/admin-ui";
import { exigirEquipe } from "@/lib/auth";
import { faixa, lerPagina, termoIlike, textoParam, totalDePaginas } from "@/lib/listagem";
import { NOME_DIFICULDADE } from "@/lib/questoes/questao";
import { BarraBusca, FiltroSelect, Paginacao, ResumoLista } from "@/components/listagem";
import { alternarStatusQuestao, excluirQuestao } from "./actions";
import { botaoMarca, CabecalhoPagina } from "@/components/sistema";

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

const POR_PAGINA = 25;

export default async function AdminQuestoes({ searchParams }: PageProps<"/admin/questoes">) {
  const params = await searchParams;
  const geracaoId = textoParam(params.geracao) || null;
  const busca = textoParam(params.q);
  const status = textoParam(params.status);
  const tipo = textoParam(params.tipo);
  const dificuldade = textoParam(params.dificuldade);
  const paginaAtual = lerPagina(params.pagina);
  const { supabase } = await exigirEquipe();

  const { data: disciplinas } = await supabase
    .from("disciplinas")
    .select("id, nome")
    .order("ordem")
    .overrideTypes<{ id: string; nome: string }[], { merge: false }>();
  // Sem escolha, abre na primeira disciplina; "todas" lista o banco inteiro.
  const escolhida = textoParam(params.disciplina);
  const disciplinaId = geracaoId || escolhida === "todas" ? undefined : escolhida || disciplinas?.[0]?.id;

  const termo = termoIlike(busca);
  const condicoes: [string, string | number][] = [];
  if (disciplinaId) condicoes.push(["disciplina_id", disciplinaId]);
  if (geracaoId) condicoes.push(["geracao_id", geracaoId]);
  if (status === "aprovada" || status === "rascunho") condicoes.push(["status", status]);
  if (tipo === "objetiva" || tipo === "discursiva") condicoes.push(["tipo", tipo]);
  if (["1", "2", "3"].includes(dificuldade)) condicoes.push(["dificuldade", Number(dificuldade)]);
  const buscaOr = termo ? `enunciado.ilike.%${termo}%,tema.ilike.%${termo}%,fonte.ilike.%${termo}%` : null;

  let consulta = supabase
    .from("questoes")
    .select("id, tema, tipo, enunciado, dificuldade, status, origem, fonte", { count: "exact" })
    .order("tema")
    .order("criado_em", { ascending: false })
    .range(...faixa(paginaAtual, POR_PAGINA));
  let contagemAprovadas = supabase.from("questoes").select("id", { count: "exact", head: true }).eq("status", "aprovada");
  for (const [coluna, valor] of condicoes) {
    consulta = consulta.eq(coluna, valor);
    contagemAprovadas = contagemAprovadas.eq(coluna, valor);
  }
  if (buscaOr) {
    consulta = consulta.or(buscaOr);
    contagemAprovadas = contagemAprovadas.or(buscaOr);
  }
  const [{ data: questoes, count }, { count: aprovadas }] = await Promise.all([
    consulta.overrideTypes<LinhaQuestao[], { merge: false }>(),
    contagemAprovadas,
  ]);

  const lista = questoes ?? [];
  const total = count ?? 0;
  const filtros = { disciplina: geracaoId ? null : escolhida, geracao: geracaoId, q: busca, status, tipo, dificuldade };

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · Questões"
        titulo="Banco de questões"
        descricao={`${total} questões · ${aprovadas ?? 0} aprovadas (entram nos simulados)`}
      >
        <Link href={`/admin/questoes/gerar?disciplina=${disciplinaId ?? ""}`} className={botaoSecundario + " px-4 py-2 text-sm"}>
          ✨ Gerar com IA
        </Link>
        <Link href="/admin/questoes/geracoes" className={botaoSecundario + " px-4 py-2 text-sm"}>
          Gerações
        </Link>
        <Link href={`/admin/questoes/importar?disciplina=${disciplinaId ?? ""}`} className={botaoSecundario + " px-4 py-2 text-sm"}>
          Importar planilha
        </Link>
        <Link href={`/admin/questoes/nova?disciplina=${disciplinaId ?? ""}`} className={botaoMarca}>
          Nova questão
        </Link>
      </CabecalhoPagina>

      {geracaoId && (
        <p className="rounded-2xl border-2 border-tinta bg-sky-50 p-3 text-sm text-sky-900">
          Mostrando as questões de uma geração por IA. Abra cada uma para revisar e aprove (clique em
          &quot;Rascunho&quot;) as que estiverem boas. <Link href="/admin/questoes" className="underline">Ver todas</Link>
        </p>
      )}

      <section className="space-y-3">
        <BarraBusca
          acao="/admin/questoes"
          busca={busca}
          placeholder="Buscar no enunciado, tema ou fonte"
          manter={{ geracao: geracaoId }}
          limpar={Boolean(busca || status || tipo || dificuldade)}
        >
          {!geracaoId && (
            <FiltroSelect
              nome="disciplina"
              valor={disciplinaId ?? "todas"}
              rotulo="Disciplina"
              opcoes={[["todas", "Todas as disciplinas"], ...(disciplinas ?? []).map((d): [string, string] => [d.id, d.nome])]}
            />
          )}
          <FiltroSelect nome="tipo" valor={tipo} rotulo="Tipo" todos="Todos os tipos" opcoes={[["objetiva", "Objetivas"], ["discursiva", "Discursivas"]]} />
          <FiltroSelect nome="status" valor={status} rotulo="Status" todos="Todos os status" opcoes={[["aprovada", "Aprovadas"], ["rascunho", "Rascunhos"]]} />
          <FiltroSelect
            nome="dificuldade"
            valor={dificuldade}
            rotulo="Dificuldade"
            todos="Todas as dificuldades"
            opcoes={Object.entries(NOME_DIFICULDADE)}
          />
        </BarraBusca>
        <ResumoLista pagina={paginaAtual} porPagina={POR_PAGINA} total={total} nome={["questão", "questões"]} />
      </section>

      {!disciplinas?.length && (
        <p className="text-sm text-slate-600">
          Crie uma disciplina antes de cadastrar questões. <Link href="/admin" className="underline">Ir para disciplinas</Link>
        </p>
      )}

      <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
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

      <Paginacao acao="/admin/questoes" pagina={paginaAtual} totalPaginas={totalDePaginas(count, POR_PAGINA)} params={filtros} />
    </div>
  );
}
