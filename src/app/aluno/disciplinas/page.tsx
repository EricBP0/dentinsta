import { LayoutList, Rows3 } from "lucide-react";
import Link from "next/link";
import { BarraProgresso, BotaoRenovar } from "@/components/cadeado";
import { Carrossel } from "@/components/catalogo/carrossel";
import { ThumbConteudo } from "@/components/catalogo/thumb-conteudo";
import { SurgirItem, SurgirLista } from "@/components/movimento";
import { iaAtiva } from "@/lib/acesso";
import { exigirLogin } from "@/lib/auth";
import { carregarCatalogo, formatarData, type DisciplinaCatalogo } from "@/lib/catalogo";
import { correspondeBusca, lerPagina, montarQuery, paginar, textoParam } from "@/lib/listagem";
import { thumbDaDisciplina } from "@/lib/thumbs";
import { NOME_TIPO_ITEM, type TipoItem } from "@/lib/tipos";
import { BarraBusca, FiltroSelect, Paginacao, ResumoLista } from "@/components/listagem";
import { CabecalhoPagina } from "@/components/sistema";

const SITUACOES = {
  andamento: "Em andamento",
  nao_iniciadas: "Não iniciadas",
  concluidas: "Concluídas",
  em_breve: "Em breve",
  bloqueadas: "Bloqueadas",
} as const;
type Situacao = keyof typeof SITUACOES;

function situacaoDoAluno(d: DisciplinaCatalogo): Situacao {
  if (d.situacao === "em_breve") return "em_breve";
  if (d.situacao !== "liberada") return "bloqueadas";
  if (d.progresso.completo) return "concluidas";
  return d.modulos.some((m) => m.itens.some((i) => i.concluido)) ? "andamento" : "nao_iniciadas";
}

export default async function Catalogo({ searchParams }: PageProps<"/aluno/disciplinas">) {
  const params = await searchParams;
  const busca = textoParam(params.q);
  const periodo = textoParam(params.periodo);
  const situacao = textoParam(params.situacao) as Situacao | "";
  const tipo = textoParam(params.tipo) as TipoItem | "";
  const visao = textoParam(params.visao) === "lista" ? "lista" : "carrossel";

  const { supabase, perfil } = await exigirLogin();
  const { acesso, disciplinas } = await carregarCatalogo(supabase, perfil);
  const equipe = perfil.papel !== "aluno";

  // Busca no nome da disciplina e no título dos conteúdos: se só conteúdos
  // casam, a disciplina aparece só com eles.
  const filtradas = disciplinas.flatMap((d) => {
    if (periodo && String(d.periodo_sugerido ?? "") !== periodo) return [];
    if (situacao && situacaoDoAluno(d) !== situacao) return [];
    const disciplinaCasa = correspondeBusca(busca, d.nome);
    const itens = d.modulos
      .flatMap((m) => m.itens)
      .filter((i) => (!tipo || i.tipo === tipo) && (disciplinaCasa || correspondeBusca(busca, i.titulo)));
    if (!disciplinaCasa && itens.length === 0) return [];
    if (tipo && itens.length === 0) return [];
    return [{ disciplina: d, itens }];
  });
  const porPagina = visao === "lista" ? 12 : 6;
  const pagina = paginar(filtradas, lerPagina(params.pagina), porPagina);
  const filtros = { q: busca, periodo, situacao, tipo, visao: visao === "lista" ? "lista" : null };
  const periodos = [...new Set(disciplinas.map((d) => d.periodo_sugerido).filter((p): p is number => p !== null))].sort(
    (a, b) => a - b,
  );

  const itensBloqueados = disciplinas
    .flatMap((d) => d.modulos.flatMap((m) => m.itens))
    .filter((i) => i.situacao === "renove").length;
  const disciplinasBloqueadas = disciplinas.filter((d) => d.situacao === "renove").length;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <CabecalhoPagina rotulo="Lab · Estudo" titulo="Disciplinas" descricao="Cada disciplina numa linha, com todos os conteúdos dela." />

        {!acesso && !equipe && (
          <div className="rounded-2xl border-2 border-tinta bg-violeta-50 p-4 text-sm text-violeta-900">
            Você ainda não tem acesso ao conteúdo. <Link href="/assinar" className="font-medium underline">Liberar acesso</Link>
          </div>
        )}

        {acesso && (
          <div className="flex flex-wrap gap-3 text-sm">
            {iaAtiva(acesso) ? (
              <span className="rounded-full border-2 border-tinta bg-lima px-3 py-1 font-semibold text-tinta">
                Novidades e IA liberadas até {formatarData(acesso.novidadesAte)}
              </span>
            ) : (
              <BotaoRenovar texto="Renove para usar a IA" />
            )}
          </div>
        )}

        {itensBloqueados > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-tinta bg-amber-50 p-4 text-sm text-amber-900">
            <span>
              {itensBloqueados} {itensBloqueados === 1 ? "novo conteúdo" : "novos conteúdos"}
              {disciplinasBloqueadas > 0 && ` e ${disciplinasBloqueadas} ${disciplinasBloqueadas === 1 ? "disciplina" : "disciplinas"}`} desde o seu acesso.
            </span>
            <BotaoRenovar />
          </div>
        )}
      </section>

      {disciplinas.length === 0 ? (
        <p className="text-slate-600">Nenhuma disciplina disponível ainda.</p>
      ) : (
        <section className="space-y-3">
          <BarraBusca
            acao="/aluno/disciplinas"
            busca={busca}
            placeholder="Buscar disciplina ou conteúdo"
            manter={{ visao: filtros.visao }}
            limpar={Boolean(busca || periodo || situacao || tipo)}
          >
            <FiltroSelect nome="situacao" valor={situacao} rotulo="Situação" todos="Todas as situações" opcoes={Object.entries(SITUACOES)} />
            {periodos.length > 0 && (
              <FiltroSelect
                nome="periodo"
                valor={periodo}
                rotulo="Período"
                todos="Todos os períodos"
                opcoes={periodos.map((p) => [String(p), `${p}º período`])}
              />
            )}
            <FiltroSelect nome="tipo" valor={tipo} rotulo="Tipo de conteúdo" todos="Todos os conteúdos" opcoes={Object.entries(NOME_TIPO_ITEM)} />
          </BarraBusca>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ResumoLista pagina={pagina.pagina} porPagina={porPagina} total={pagina.total} nome={["disciplina", "disciplinas"]} />
            <div className="ml-auto flex rounded-full border-2 border-tinta bg-white p-0.5 text-xs font-semibold" role="group" aria-label="Visualização">
              {(
                [
                  ["carrossel", "Carrossel", Rows3],
                  ["lista", "Lista", LayoutList],
                ] as const
              ).map(([valor, texto, Icone]) => (
                <Link
                  key={valor}
                  href={`/aluno/disciplinas${montarQuery({ ...filtros, visao: valor === "lista" ? "lista" : null })}`}
                  aria-current={visao === valor ? "true" : undefined}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${visao === valor ? "bg-tinta text-white" : "text-tinta hover:bg-lima"}`}
                >
                  <Icone className="size-3.5" /> {texto}
                </Link>
              ))}
            </div>
          </div>
          {pagina.total === 0 && (
            <p className="rounded-2xl border-2 border-tinta bg-white p-6 text-center text-sm text-slate-600">
              Nada encontrado com essa busca.
            </p>
          )}
        </section>
      )}

      {visao === "lista" ? (
        <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
          {pagina.itens.map(({ disciplina: d, itens }) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold text-tinta">
                  {d.situacao === "liberada" ? (
                    <Link href={`/aluno/disciplinas/${d.slug}`} className="hover:text-violeta-700">
                      {d.nome}
                    </Link>
                  ) : (
                    d.nome
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {itens.length} {itens.length === 1 ? "conteúdo" : "conteúdos"}
                  {d.periodo_sugerido && ` · ${d.periodo_sugerido}º período`} · {SITUACOES[situacaoDoAluno(d)]}
                </p>
              </div>
              {d.situacao === "liberada" && d.progresso.total > 0 && (
                <div className="w-full sm:w-56">
                  <BarraProgresso feitos={d.progresso.concluidos} total={d.progresso.total} />
                </div>
              )}
              <AcaoDisciplina d={d} />
            </li>
          ))}
        </ul>
      ) : (
        <SurgirLista className="space-y-10">
          {pagina.itens.map(({ disciplina: d, itens }) => {
            const arte = thumbDaDisciplina(d.slug);
            const pct = d.progresso.total ? Math.round((d.progresso.concluidos / d.progresso.total) * 100) : 0;
            return (
              <SurgirItem key={d.id} className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-tinta">
                      {d.situacao === "liberada" ? (
                        <Link href={`/aluno/disciplinas/${d.slug}`} className="hover:text-violeta-700">
                          {d.nome}
                        </Link>
                      ) : (
                        d.nome
                      )}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {itens.length} {itens.length === 1 ? "conteúdo" : "conteúdos"}
                      {d.periodo_sugerido && ` · ${d.periodo_sugerido}º período`}
                      {d.situacao === "liberada" && d.progresso.total > 0 && ` · ${pct}% concluído`}
                    </p>
                  </div>
                  <AcaoDisciplina d={d} />
                </div>

                {itens.length > 0 && (
                  <Carrossel rotulo={`Conteúdos de ${d.nome}`}>
                    {itens.map((item) => (
                      <ThumbConteudo
                        key={item.id}
                        arte={arte}
                        disciplina={d.nome}
                        titulo={item.titulo}
                        tipo={item.tipo}
                        concluido={item.concluido}
                        bloqueado={item.situacao !== "liberado"}
                        href={
                          item.situacao === "liberado"
                            ? `/aluno/itens/${item.id}`
                            : item.situacao === "renove"
                              ? "/renovar"
                              : "/assinar"
                        }
                      />
                    ))}
                  </Carrossel>
                )}
              </SurgirItem>
            );
          })}
        </SurgirLista>
      )}

      <Paginacao acao="/aluno/disciplinas" pagina={pagina.pagina} totalPaginas={pagina.totalPaginas} params={filtros} />
    </div>
  );
}

function AcaoDisciplina({ d }: { d: DisciplinaCatalogo }) {
  if (d.situacao === "liberada")
    return (
      <Link href={`/aluno/disciplinas/${d.slug}`} className="text-sm font-medium text-violeta-700 hover:underline">
        Ver disciplina →
      </Link>
    );
  if (d.situacao === "em_breve") return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">Em breve</span>;
  if (d.situacao === "renove") return <BotaoRenovar />;
  return (
    <Link href="/assinar" className="text-sm font-medium text-violeta-700 underline">
      Liberar acesso
    </Link>
  );
}
