import { Download } from "lucide-react";
import { BarraBusca, FiltroSelect, Paginacao, ResumoLista } from "@/components/listagem";
import { CabecalhoPagina } from "@/components/sistema";
import { exigirAdmin } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import { faixa, lerPagina, montarQuery, totalDePaginas } from "@/lib/listagem";
import { pergunta, PERFIS, rotuloDaResposta, type PerfilCliente } from "@/lib/perfil-cliente";
import { consultarPerfis, lerFiltros, ORIGENS } from "./consulta";

const POR_PAGINA = 20;
type Resumo = { perfil: PerfilCliente | null; etiquetas: string[]; nota_anual: number; aceita_contato: boolean; etapa2_em: string | null };

/** Respostas do formulário de mapeamento: quem são os compradores e de onde vieram. */
export default async function Perfis({ searchParams }: PageProps<"/admin/perfis">) {
  const params = await searchParams;
  const { supabase } = await exigirAdmin();
  const filtros = lerFiltros(params);
  const pagina = lerPagina(params.pagina);

  const [{ data: linhas, count }, { data: todos }, { data: disciplinas }] = await Promise.all([
    consultarPerfis(supabase, filtros, faixa(pagina, POR_PAGINA)),
    supabase
      .from("perfis_cliente")
      .select("perfil, etiquetas, nota_anual, aceita_contato, etapa2_em")
      .not("etapa1_em", "is", null)
      .overrideTypes<Resumo[], { merge: false }>(),
    supabase.from("disciplinas").select("id, nome").overrideTypes<{ id: string; nome: string }[], { merge: false }>(),
  ]);
  const nomes = Object.fromEntries((disciplinas ?? []).map((d) => [d.id, d.nome]));
  const base = todos ?? [];
  const contar = (teste: (r: Resumo) => boolean) => base.filter(teste).length;
  const porPerfil = (Object.keys(PERFIS) as PerfilCliente[])
    .map((p) => [p, contar((r) => r.perfil === p)] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const porOrigem = ORIGENS.map(([v, rotulo]) => [rotulo, contar((r) => r.etiquetas.includes(`origem:${v}`))] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · Clientes"
        titulo="Perfis"
        descricao="Respostas do “Personalize sua OdontoLab”: perfil, dores, origem e a nota para o Completo anual."
      >
        <a
          href={`/admin/perfis/csv${montarQuery(filtros)}`}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-lima px-4 py-2 text-sm font-bold text-lima hover:bg-lima hover:text-tinta"
        >
          <Download className="size-4" /> Exportar CSV
        </a>
      </CabecalhoPagina>

      <section className="grid gap-3 sm:grid-cols-4">
        <Numero rotulo="Responderam a etapa 1" valor={base.length} />
        <Numero rotulo="Completaram a etapa 2" valor={contar((r) => r.etapa2_em !== null)} />
        <Numero rotulo="Nota do anual 6 ou mais" valor={contar((r) => r.nota_anual >= 6)} />
        <Numero rotulo="Aceitam contato" valor={contar((r) => r.aceita_contato)} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Distribuicao titulo="Por perfil" itens={porPerfil.map(([p, n]) => [PERFIS[p], n])} total={base.length} />
        <Distribuicao titulo="Como conheceram (pergunta 4)" itens={porOrigem} total={contar((r) => r.etiquetas.some((e) => e.startsWith("origem:")))} />
      </section>

      <section className="space-y-3">
        <BarraBusca
          acao="/admin/perfis"
          busca={filtros.q}
          placeholder="Buscar por nome ou e-mail"
          limpar={Object.values(filtros).some(Boolean)}
        >
          <FiltroSelect nome="perfil" valor={filtros.perfil} rotulo="Perfil" todos="Todos os perfis" opcoes={Object.entries(PERFIS)} />
          <FiltroSelect nome="origem" valor={filtros.origem} rotulo="Origem" todos="Todas as origens" opcoes={ORIGENS.map(([v, r]) => [v, r])} />
          <FiltroSelect nome="nota" valor={filtros.nota} rotulo="Nota" todos="Qualquer nota" opcoes={[["6", "Nota do anual 6+"]]} />
          <FiltroSelect nome="contato" valor={filtros.contato} rotulo="Contato" todos="Com ou sem contato" opcoes={[["1", "Aceitam contato"]]} />
        </BarraBusca>
        <ResumoLista pagina={pagina} porPagina={POR_PAGINA} total={count ?? 0} nome={["pessoa", "pessoas"]} />
        <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
          {(linhas ?? []).length === 0 && <li className="p-4 text-sm text-slate-600">Ninguém encontrado.</li>}
          {(linhas ?? []).map((l) => (
            <li key={l.usuario_id}>
              <details className="group p-4">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong className="text-slate-900">{l.perfis.nome || l.perfis.email}</strong>
                    <span className="block text-xs text-slate-500">
                      {l.perfis.email} · {l.perfil ? PERFIS[l.perfil] : "Sem perfil"} · {formatarData(l.atualizado_em)}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold ${l.nota_anual >= 6 ? "bg-lima text-tinta" : "bg-slate-100 text-slate-600"}`}
                    >
                      Anual {l.nota_anual}/10
                    </span>
                    {l.aceita_contato && (
                      <span className="rounded-full bg-violeta-50 px-2 py-0.5 text-violeta-800">
                        Contato: {rotuloDaResposta("p25", l.respostas.p25)}
                      </span>
                    )}
                    {!l.etapa2_em && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">Só etapa 1</span>}
                  </span>
                </summary>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {Object.entries(l.respostas)
                    .filter(([id]) => /^p\d+$/.test(id))
                    .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
                    .map(([id, valor]) => (
                      <div key={id}>
                        <dt className="text-xs text-slate-500">
                          {id.slice(1)}. {pergunta(id)?.texto}
                        </dt>
                        <dd className="text-slate-800">
                          {rotuloDaResposta(id, valor, nomes)}
                          {id === "p3" && l.respostas.p3_cidade ? ` · ${l.respostas.p3_cidade}` : ""}
                          {l.respostas[`${id}_extra`] ? ` · ${l.respostas[`${id}_extra`]}` : ""}
                        </dd>
                      </div>
                    ))}
                </dl>
              </details>
            </li>
          ))}
        </ul>
        <Paginacao acao="/admin/perfis" pagina={pagina} totalPaginas={totalDePaginas(count, POR_PAGINA)} params={filtros} />
      </section>
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-2xl border-2 border-tinta bg-white p-4">
      <p className="text-xs text-slate-500">{rotulo}</p>
      <p className="text-2xl font-extrabold text-tinta">{valor}</p>
    </div>
  );
}

function Distribuicao({ titulo, itens, total }: { titulo: string; itens: readonly (readonly [string, number])[]; total: number }) {
  return (
    <div className="space-y-3 rounded-2xl border-2 border-tinta bg-white p-5">
      <h2 className="font-extrabold tracking-tight text-tinta">{titulo}</h2>
      {itens.length === 0 && <p className="text-sm text-slate-500">Sem respostas ainda.</p>}
      <ul className="space-y-2 text-sm">
        {itens.map(([rotulo, n]) => (
          <li key={rotulo}>
            <div className="flex justify-between gap-2">
              <span className="text-slate-700">{rotulo}</span>
              <span className="font-semibold text-tinta">
                {n} <span className="text-xs font-normal text-slate-500">({total ? Math.round((n / total) * 100) : 0}%)</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-violeta" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
