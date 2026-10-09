import Link from "next/link";
import { AreaBloqueada } from "@/components/cadeado";
import { temModulo } from "@/lib/acesso";
import { exigirLogin } from "@/lib/auth";
import { carregarCatalogo } from "@/lib/catalogo";
import { carregarResumo, carregarSessao, type ResumoDeck } from "@/lib/flashcards/sessao";
import { correspondeBusca, lerPagina, paginar, textoParam } from "@/lib/listagem";
import { SessaoEstudo } from "./sessao-estudo";
import { BarraBusca, FiltroSelect, Paginacao, ResumoLista } from "@/components/listagem";
import { botaoMarca, CabecalhoPagina } from "@/components/sistema";

const SITUACOES = {
  revisar: "Com cards para revisar",
  novos: "Com cards novos",
  em_dia: "Em dia",
} as const;
const POR_PAGINA = 15;

function situacaoDeck(resumo: ResumoDeck | undefined, filtro: string) {
  if (!filtro) return true;
  if (!resumo) return false;
  if (filtro === "revisar") return resumo.vencidos > 0;
  if (filtro === "novos") return resumo.vistos < resumo.total;
  return resumo.vencidos === 0 && resumo.vistos === resumo.total;
}

export default async function RevisaoDoDia({ searchParams }: PageProps<"/aluno/flashcards">) {
  const params = await searchParams;
  const { estudar } = params;
  const busca = textoParam(params.q);
  const disciplina = textoParam(params.disciplina);
  const situacao = textoParam(params.situacao);
  const { supabase, perfil } = await exigirLogin();
  const [{ acesso, disciplinas }, resumo] = await Promise.all([carregarCatalogo(supabase, perfil), carregarResumo(supabase)]);
  if (!temModulo(acesso, "flashcards", perfil.papel !== "aluno")) {
    return <AreaBloqueada modulo="flashcards" temAssinatura={Boolean(acesso)} />;
  }

  // Decks liberados, com nome da disciplina, na ordem do catálogo.
  const decks = disciplinas.flatMap((d) =>
    d.modulos.flatMap((m) =>
      m.itens
        .filter((i) => i.tipo === "flashcards" && i.situacao === "liberado")
        .map((i) => ({
          id: i.id,
          titulo: i.titulo,
          disciplina: d.nome,
          disciplinaSlug: d.slug,
          resumo: resumo.find((r) => r.item_id === i.id),
        })),
    ),
  );
  const nomesDecks = Object.fromEntries(decks.map((d) => [d.id, `${d.disciplina} · ${d.titulo}`]));
  const vencidos = resumo.reduce((soma, r) => soma + r.vencidos, 0);
  const novos = resumo.reduce((soma, r) => soma + (r.total - r.vistos), 0);

  if (estudar === "1") {
    const cards = await carregarSessao(supabase, perfil.id, null);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/aluno/flashcards" className="text-sm text-slate-600 hover:text-slate-900">
          ← Flashcards
        </Link>
        <CabecalhoPagina rotulo="Lab · Memória" titulo="Revisão do dia" />
        <SessaoEstudo cards={cards} nomesDecks={nomesDecks} />
      </div>
    );
  }

  const filtrados = decks.filter(
    (d) =>
      (!disciplina || d.disciplinaSlug === disciplina) &&
      situacaoDeck(d.resumo, situacao) &&
      correspondeBusca(busca, d.titulo, d.disciplina),
  );
  const pagina = paginar(filtrados, lerPagina(params.pagina), POR_PAGINA);
  const filtros = { q: busca, disciplina, situacao };
  const disciplinasComDeck = [...new Map(decks.map((d) => [d.disciplinaSlug, d.disciplina])).entries()];

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        rotulo="Lab · Memória"
        titulo="Flashcards"
        descricao="Repetição espaçada: cada card volta no momento certo para você não esquecer."
      >
        {vencidos + novos > 0 && (
          <Link href="/aluno/flashcards?estudar=1" className={botaoMarca}>
            Revisar agora ({vencidos} para revisar{novos > 0 && `, ${novos} novos`})
          </Link>
        )}
      </CabecalhoPagina>

      {decks.length > 0 && (
        <section className="space-y-3">
          <BarraBusca
            acao="/aluno/flashcards"
            busca={busca}
            placeholder="Buscar deck ou disciplina"
            limpar={Boolean(busca || disciplina || situacao)}
          >
            <FiltroSelect
              nome="disciplina"
              valor={disciplina}
              rotulo="Disciplina"
              todos="Todas as disciplinas"
              opcoes={disciplinasComDeck}
            />
            <FiltroSelect nome="situacao" valor={situacao} rotulo="Situação" todos="Todos os decks" opcoes={Object.entries(SITUACOES)} />
          </BarraBusca>
          <ResumoLista pagina={pagina.pagina} porPagina={POR_PAGINA} total={pagina.total} nome={["deck", "decks"]} />
        </section>
      )}

      <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
        {decks.length === 0 && <li className="p-4 text-sm text-slate-600">Nenhum deck de flashcards liberado ainda.</li>}
        {decks.length > 0 && pagina.total === 0 && <li className="p-4 text-sm text-slate-600">Nenhum deck encontrado com essa busca.</li>}
        {pagina.itens.map((d) => (
          <li key={d.id}>
            <Link href={`/aluno/itens/${d.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-900">{d.titulo}</p>
                <p className="text-xs text-slate-500">{d.disciplina}</p>
              </div>
              <p className="text-sm text-slate-600">
                {d.resumo ? (
                  <>
                    {d.resumo.vistos}/{d.resumo.total} vistos
                    {d.resumo.vencidos > 0 && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                        {d.resumo.vencidos} para revisar
                      </span>
                    )}
                  </>
                ) : (
                  "Sem cards ainda"
                )}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <Paginacao acao="/aluno/flashcards" pagina={pagina.pagina} totalPaginas={pagina.totalPaginas} params={filtros} />
    </div>
  );
}
