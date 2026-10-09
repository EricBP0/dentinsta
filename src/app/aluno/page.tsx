import { ArrowDownRight, ArrowRight, ArrowUpRight, Flame, GraduationCap, Layers, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { BarraProgresso, BotaoRenovar } from "@/components/cadeado";
import { GraficoColunas, GraficoLinha } from "@/components/graficos";
import { BarraAnimada, NumeroAnimado, SurgirItem, SurgirLista } from "@/components/movimento";
import { Button } from "@/components/ui/button";
import { iaAtiva } from "@/lib/acesso";
import { exigirLogin } from "@/lib/auth";
import { carregarCatalogo, formatarData, type DisciplinaCatalogo } from "@/lib/catalogo";
import { carregarResumo } from "@/lib/flashcards/sessao";
import { cotaMensal, inicioDoMes } from "@/lib/ia/cota";
import {
  diaBrasilia,
  formatarDuracao,
  mediaComVariacao,
  sequenciaDeDias,
  temasParaReforcar,
  ultimosDias,
  type DesempenhoTema,
} from "@/lib/painel";
import { NOME_TIPO_ITEM } from "@/lib/tipos";
import { PaginadoLocal } from "@/components/paginado-local";
import { CabecalhoPagina } from "@/components/sistema";

type SimuladoFeito = { id: string; nota: number; finalizado_em: string; disciplinas: { nome: string } };

function dataCurta(dia: string) {
  const [, mes, d] = dia.split("-");
  return `${d}/${mes}`;
}

/** Próximo item a estudar: o primeiro não concluído da disciplina estudada mais recentemente. */
function continuarDeOndeParou(disciplinas: DisciplinaCatalogo[], ultimoItemId: string | null) {
  const liberadas = disciplinas.filter((d) => d.situacao === "liberada");
  const recente = ultimoItemId
    ? liberadas.find((d) => d.modulos.some((m) => m.itens.some((i) => i.id === ultimoItemId)))
    : undefined;
  for (const disciplina of recente ? [recente, ...liberadas] : liberadas) {
    for (const modulo of disciplina.modulos) {
      const item = modulo.itens.find((i) => i.situacao === "liberado" && !i.concluido);
      if (item) return { disciplina, item };
    }
  }
  return null;
}

function Variacao({ valor, sufixo, periodo }: { valor: number | null; sufixo?: string; periodo: string }) {
  if (valor === null || valor === 0) return <p className="text-xs text-slate-500">{valor === 0 ? `igual à ${periodo}` : " "}</p>;
  const subiu = valor > 0;
  const Icone = subiu ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={`flex items-center gap-0.5 text-xs ${subiu ? "text-violeta-700" : "text-slate-600"}`}>
      <Icone className="size-3.5" />
      {subiu ? "+" : ""}
      {valor.toLocaleString("pt-BR")}
      {sufixo} vs {periodo}
    </p>
  );
}

function Indicador({ rotulo, children, rodape }: { rotulo: string; children: React.ReactNode; rodape?: React.ReactNode }) {
  return (
    <SurgirItem className="rounded-2xl border-2 border-tinta bg-white p-4">
      <p className="text-xs text-slate-500">{rotulo}</p>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{children}</div>
      <div className="mt-1 min-h-4">{rodape}</div>
    </SurgirItem>
  );
}

export default async function Painel() {
  const { supabase, perfil } = await exigirLogin();
  const equipe = perfil.papel !== "aluno";
  const agora = new Date();

  const [
    { acesso, disciplinas },
    resumoFlashcards,
    { data: simulados },
    { data: tempos },
    { data: temas },
    { count: correcoesNoMes },
    { data: ultimoProgresso },
  ] = await Promise.all([
    carregarCatalogo(supabase, perfil),
    carregarResumo(supabase),
    supabase
      .from("simulados")
      .select("id, nota, finalizado_em, disciplinas(nome)")
      .eq("usuario_id", perfil.id)
      .eq("status", "finalizado")
      .not("nota", "is", null)
      .gte("finalizado_em", new Date(agora.getTime() - 60 * 864e5).toISOString())
      .order("finalizado_em")
      .overrideTypes<SimuladoFeito[], { merge: false }>(),
    supabase
      .from("tempo_estudo")
      .select("dia, segundos")
      .eq("usuario_id", perfil.id)
      .gte("dia", ultimosDias(400, agora)[0])
      .overrideTypes<{ dia: string; segundos: number }[], { merge: false }>(),
    supabase.rpc("desempenho_por_tema", { p_dias: 90 }),
    supabase
      .from("uso_ia")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", perfil.id)
      .eq("tipo", "correcao")
      .gte("criado_em", inicioDoMes(agora).toISOString()),
    supabase
      .from("progresso_item")
      .select("item_id")
      .eq("usuario_id", perfil.id)
      .order("atualizado_em", { ascending: false })
      .limit(1)
      .maybeSingle<{ item_id: string }>(),
  ]);

  // Notas
  const notas = (simulados ?? []).map((s) => ({ ...s, nota: Number(s.nota) }));
  const semana = mediaComVariacao(notas, 7, agora);
  const ultimos30 = notas.filter((s) => new Date(s.finalizado_em).getTime() >= agora.getTime() - 30 * 864e5);

  // Tempo de estudo
  const tempoPorDia = Object.fromEntries((tempos ?? []).map((t) => [t.dia, t.segundos]));
  const dias14 = ultimosDias(14, agora);
  const soma = (dias: string[]) => dias.reduce((s, d) => s + (tempoPorDia[d] ?? 0), 0);
  const tempoSemana = soma(dias14.slice(7));
  const tempoSemanaAnterior = soma(dias14.slice(0, 7));
  const sequencia = sequenciaDeDias(tempoPorDia, agora);
  const hoje = diaBrasilia(agora);

  // Demais
  const flashcardsHoje = resumoFlashcards.reduce((s, r) => s + r.vencidos, 0);
  const reforcar = temasParaReforcar(
    ((temas ?? []) as DesempenhoTema[]).map((t) => ({ ...t, respondidas: Number(t.respondidas), media: Number(t.media) })),
    3,
    Infinity,
  );
  const liberadas = disciplinas.filter((d) => d.situacao === "liberada");
  const concluidas = liberadas.filter((d) => d.progresso.completo);
  const continuar = continuarDeOndeParou(disciplinas, ultimoProgresso?.item_id ?? null);
  const itensBloqueados = disciplinas.flatMap((d) => d.modulos.flatMap((m) => m.itens)).filter((i) => i.situacao === "renove").length;
  const comIa = equipe || iaAtiva(acesso);

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        rotulo="Lab · Painel"
        titulo={`Olá${perfil.nome ? `, ${perfil.nome.split(" ")[0]}` : ""}!`}
        descricao={sequencia > 1 ? `Você estudou ${sequencia} dias seguidos. Continue assim!` : "Bora estudar hoje?"}
      >
        {acesso &&
          (iaAtiva(acesso) ? (
            <span className="rounded-full bg-tinta px-3 py-1 text-xs font-semibold text-lima">
              Novidades e IA até {formatarData(acesso.novidadesAte)}
            </span>
          ) : (
            <BotaoRenovar texto="Renove para usar a IA" />
          ))}
      </CabecalhoPagina>

      {!acesso && !equipe && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-tinta bg-violeta-50 p-4 text-sm text-violeta-900">
          Você ainda não tem acesso ao conteúdo.
          <Button asChild>
            <Link href="/assinar">Liberar acesso</Link>
          </Button>
        </div>
      )}

      {/* Próximos passos */}
      <section className="grid gap-4 md:grid-cols-3">
        {continuar ? (
          <Link
            href={`/aluno/itens/${continuar.item.id}`}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violeta-700 to-violeta-900 p-5 text-white md:col-span-2"
          >
            <div aria-hidden className="absolute -right-12 -top-12 size-40 rounded-full bg-violeta-500/30 blur-2xl" />
            <p className="text-xs font-medium uppercase tracking-wide text-violeta-100">Continue de onde parou</p>
            <p className="mt-2 text-lg font-semibold">{continuar.item.titulo}</p>
            <p className="text-sm text-violeta-100">
              {NOME_TIPO_ITEM[continuar.item.tipo]} · {continuar.disciplina.nome}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
              Continuar <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ) : (
          <Link href="/aluno/disciplinas" className="rounded-2xl border-2 border-tinta bg-white p-5 md:col-span-2">
            <p className="text-lg font-semibold text-slate-900">Escolha uma disciplina para começar</p>
            <p className="text-sm text-slate-600">Vídeos, resumos, mapas mentais e flashcards organizados por período.</p>
          </Link>
        )}
        <div className="grid gap-3">
          <Link
            href={flashcardsHoje > 0 ? "/aluno/flashcards?estudar=1" : "/aluno/flashcards"}
            className="flex items-center gap-3 rounded-2xl border-2 border-tinta bg-white p-4 hover:shadow-md"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Layers className="size-4" />
            </span>
            <span className="text-sm">
              <strong className="block text-slate-900">
                {flashcardsHoje > 0 ? `${flashcardsHoje} flashcards para hoje` : "Flashcards em dia"}
              </strong>
              <span className="text-slate-500">{flashcardsHoje > 0 ? "Revisar agora" : "Ver decks"}</span>
            </span>
          </Link>
          <Link href="/aluno/simulados" className="flex items-center gap-3 rounded-2xl border-2 border-tinta bg-white p-4 hover:shadow-md">
            <span className="flex size-9 items-center justify-center rounded-xl bg-violeta-50 text-violeta-700">
              <Sparkles className="size-4" />
            </span>
            <span className="text-sm">
              <strong className="block text-slate-900">Fazer um simulado</strong>
              <span className="text-slate-500">
                {comIa ? `Correções por IA: ${correcoesNoMes ?? 0} de ${cotaMensal()} no mês` : "Questões objetivas"}
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* Indicadores */}
      <SurgirLista className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          rotulo="Média nos simulados (7 dias)"
          rodape={<Variacao valor={semana.variacao} periodo="semana anterior" />}
        >
          {semana.media !== null ? <NumeroAnimado valor={semana.media} /> : <span className="text-slate-400">—</span>}
        </Indicador>
        <Indicador
          rotulo="Tempo de estudo (7 dias)"
          rodape={
            tempoSemanaAnterior > 0 ? (
              <Variacao
                valor={Math.round(((tempoSemana - tempoSemanaAnterior) / tempoSemanaAnterior) * 100)}
                sufixo="%"
                periodo="semana anterior"
              />
            ) : null
          }
        >
          {formatarDuracao(tempoSemana)}
        </Indicador>
        <Indicador
          rotulo="Sequência de estudo"
          rodape={
            <p className="text-xs text-slate-500">
              {(tempoPorDia[hoje] ?? 0) >= 60 ? "Hoje já contou ✓" : "Estude hoje para manter"}
            </p>
          }
        >
          <span className="inline-flex items-center gap-1.5">
            <Flame className={`size-5 ${sequencia > 0 ? "text-amber-500" : "text-slate-300"}`} />
            {sequencia} {sequencia === 1 ? "dia" : "dias"}
          </span>
        </Indicador>
        <Indicador
          rotulo="Disciplinas concluídas"
          rodape={<p className="text-xs text-slate-500">de {liberadas.length} liberadas</p>}
        >
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="size-5 text-violeta-600" />
            {concluidas.length}
          </span>
        </Indicador>
      </SurgirLista>

      {/* Gráficos */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border-2 border-tinta bg-white p-5">
          <h2 className="font-extrabold tracking-tight text-tinta">Notas nos simulados</h2>
          <p className="mb-3 text-xs text-slate-500">Últimos 30 dias · uma nota por simulado</p>
          {ultimos30.length >= 2 ? (
            <GraficoLinha
              titulo="Notas nos simulados nos últimos 30 dias"
              pontos={ultimos30.map((s) => ({
                rotulo: dataCurta(diaBrasilia(new Date(s.finalizado_em))),
                valor: s.nota,
                detalhe: `${s.disciplinas.nome} · ${formatarData(s.finalizado_em)}`,
              }))}
              maximo={10}
              formato="nota"
              cabecalhoTabela={["Simulado", "Nota"]}
            />
          ) : (
            <p className="flex h-48 items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-slate-500">
              Faça pelo menos 2 simulados para ver sua evolução aqui.
            </p>
          )}
        </div>
        <div className="rounded-2xl border-2 border-tinta bg-white p-5">
          <h2 className="font-extrabold tracking-tight text-tinta">Tempo de estudo por dia</h2>
          <p className="mb-3 text-xs text-slate-500">Últimos 14 dias · minutos ativos em aulas, simulados e flashcards</p>
          {tempoSemana + tempoSemanaAnterior > 0 ? (
            <GraficoColunas
              titulo="Minutos de estudo por dia nos últimos 14 dias"
              pontos={dias14.map((d) => ({
                rotulo: dataCurta(d),
                valor: Math.round((tempoPorDia[d] ?? 0) / 60),
                detalhe: d === hoje ? "Hoje" : dataCurta(d),
              }))}
              formato="minutos"
              cabecalhoTabela={["Dia", "Tempo"]}
            />
          ) : (
            <p className="flex h-48 items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-slate-500">
              Seu tempo de estudo aparece aqui assim que você começar.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* Onde reforçar */}
        <div className="rounded-2xl border-2 border-tinta bg-white p-5">
          <h2 className="font-extrabold tracking-tight text-tinta">Onde reforçar</h2>
          <p className="mb-4 text-xs text-slate-500">Temas com menor média nos últimos 90 dias (mínimo de 3 questões)</p>
          {reforcar.length ? (
            <PaginadoLocal porPagina={5} rotulo="onde reforçar" className="space-y-4">
              {reforcar.map((t) => (
                <li key={`${t.disciplina}-${t.tema}`} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-slate-900">
                      {t.tema} <span className="text-xs text-slate-500">· {t.disciplina}</span>
                    </span>
                    <span className="shrink-0 font-medium text-slate-900">
                      {t.media.toLocaleString("pt-BR")}
                      <span className="text-xs font-normal text-slate-500"> / 10</span>
                    </span>
                  </div>
                  <BarraAnimada porcentagem={t.media * 10} />
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    {t.media < 6 && <TriangleAlert className="size-3.5 text-amber-600" aria-label="Atenção" />}
                    {t.respondidas} questões respondidas{t.media < 6 ? " · abaixo de 6" : ""}
                  </p>
                </li>
              ))}
            </PaginadoLocal>
          ) : (
            <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
              Responda mais questões nos simulados para descobrir seus pontos fracos.
            </p>
          )}
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/aluno/simulados">Treinar com simulado</Link>
          </Button>
        </div>

        {/* Progresso e certificados */}
        <div className="rounded-2xl border-2 border-tinta bg-white p-5">
          <h2 className="font-extrabold tracking-tight text-tinta">Progresso e certificados</h2>
          <p className="mb-4 text-xs text-slate-500">Conclua os itens obrigatórios para ganhar o certificado</p>
          {liberadas.length ? (
            <PaginadoLocal porPagina={5} rotulo="progresso das disciplinas" className="space-y-4">
              {liberadas.map((d) => (
                <li key={d.id}>
                  <Link href={`/aluno/disciplinas/${d.slug}`} className="block space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-slate-900">{d.nome}</span>
                      {d.progresso.completo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violeta-50 px-2 py-0.5 text-xs text-violeta-800">
                          <GraduationCap className="size-3.5" /> Concluída
                        </span>
                      )}
                    </div>
                    <BarraProgresso feitos={d.progresso.concluidos} total={d.progresso.total} />
                  </Link>
                </li>
              ))}
            </PaginadoLocal>
          ) : (
            <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Nenhuma disciplina liberada ainda.</p>
          )}
          {concluidas.length > 0 && (
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/aluno/certificados">Ver certificados</Link>
            </Button>
          )}
        </div>
      </section>

      {itensBloqueados > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-tinta bg-amber-50 p-4 text-sm text-amber-900">
          <span>
            {itensBloqueados} {itensBloqueados === 1 ? "novo conteúdo publicado" : "novos conteúdos publicados"} depois do
            seu período de novidades.
          </span>
          <BotaoRenovar />
        </div>
      )}
    </div>
  );
}
