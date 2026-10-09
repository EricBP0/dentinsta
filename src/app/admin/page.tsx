import Link from "next/link";
import { botaoPrimario, campo, Selo } from "@/components/admin-ui";
import { exigirEquipe } from "@/lib/auth";
import { faixa, lerPagina, termoIlike, textoParam, totalDePaginas } from "@/lib/listagem";
import { NOME_STATUS_DISCIPLINA, type Disciplina, type StatusDisciplina } from "@/lib/tipos";
import { criarDisciplina } from "./actions";
import { BarraBusca, FiltroSelect, Paginacao, ResumoLista } from "@/components/listagem";
import { CabecalhoPagina } from "@/components/sistema";

const POR_PAGINA = 20;

export default async function AdminDisciplinas({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  const busca = textoParam(params.q);
  const status = textoParam(params.status);
  const periodo = textoParam(params.periodo);
  const paginaAtual = lerPagina(params.pagina);
  const { supabase } = await exigirEquipe();

  let consulta = supabase
    .from("disciplinas")
    .select("*, modulos(count)", { count: "exact" })
    .order("ordem")
    .order("nome")
    .range(...faixa(paginaAtual, POR_PAGINA));
  const termo = termoIlike(busca);
  if (termo) consulta = consulta.or(`nome.ilike.%${termo}%,slug.ilike.%${termo}%`);
  if (status in NOME_STATUS_DISCIPLINA) consulta = consulta.eq("status", status as StatusDisciplina);
  if (/^\d+$/.test(periodo)) consulta = consulta.eq("periodo_sugerido", Number(periodo));
  const { data: disciplinas, count } = await consulta.overrideTypes<
    (Disciplina & { modulos: { count: number }[] })[],
    { merge: false }
  >();
  const filtros = { q: busca, status, periodo };
  const filtrando = Boolean(busca || status || periodo);

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · Conteúdo"
        titulo="Disciplinas"
        descricao="Crie a disciplina, organize módulos e itens e publique quando estiver pronta."
      />

      <form action={criarDisciplina} className="flex flex-col gap-3 sm:flex-row">
        <input name="nome" placeholder="Nome da nova disciplina (ex.: Endodontia)" required className={campo} />
        <button className={`${botaoPrimario} shrink-0`}>Criar disciplina</button>
      </form>

      <section className="space-y-3">
        <BarraBusca acao="/admin" busca={busca} placeholder="Buscar disciplina" limpar={filtrando}>
          <FiltroSelect
            nome="status"
            valor={status}
            rotulo="Status"
            todos="Todos os status"
            opcoes={Object.entries(NOME_STATUS_DISCIPLINA)}
          />
          <FiltroSelect
            nome="periodo"
            valor={periodo}
            rotulo="Período"
            todos="Todos os períodos"
            opcoes={Array.from({ length: 12 }, (_, i) => [String(i + 1), `${i + 1}º período`])}
          />
        </BarraBusca>
        <ResumoLista pagina={paginaAtual} porPagina={POR_PAGINA} total={count ?? 0} nome={["disciplina", "disciplinas"]} />
      </section>

      <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
        {(disciplinas ?? []).length === 0 && (
          <li className="p-4 text-sm text-slate-600">
            {filtrando ? "Nenhuma disciplina encontrada com essa busca." : "Nenhuma disciplina cadastrada."}
          </li>
        )}
        {(disciplinas ?? []).map((d) => (
          <li key={d.id}>
            <Link
              href={`/admin/disciplinas/${d.id}`}
              className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">{d.nome}</p>
                <p className="text-xs text-slate-500">
                  {d.modulos[0]?.count ?? 0} módulos
                  {d.periodo_sugerido && ` · ${d.periodo_sugerido}º período`}
                </p>
              </div>
              <Selo status={d.status} texto={NOME_STATUS_DISCIPLINA[d.status]} />
            </Link>
          </li>
        ))}
      </ul>

      <Paginacao acao="/admin" pagina={paginaAtual} totalPaginas={totalDePaginas(count, POR_PAGINA)} params={filtros} />
    </div>
  );
}
