import { botaoPerigo, botaoPrimario, campo, Selo } from "@/components/admin-ui";
import { exigirAdmin } from "@/lib/auth";
import { faixa, lerPagina, termoIlike, textoParam, totalDePaginas } from "@/lib/listagem";
import { BarraBusca, FiltroSelect, Paginacao, ResumoLista } from "@/components/listagem";
import { formatarData } from "@/lib/catalogo";
import { inicioDoMes } from "@/lib/ia/cota";
import { formatarReais } from "@/lib/preco";
import { liberarAcesso, revogarAcesso } from "./actions";
import { CabecalhoPagina } from "@/components/sistema";

type Compra = {
  id: string;
  tipo: "compra" | "renovacao";
  modalidade: "a_vista" | "parcelado";
  parcelas: number;
  valor_total_centavos: number;
  status: string;
  criado_em: string;
  pago_em: string | null;
  perfis: { nome: string; email: string };
};

type Aluno = {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
  acessos: { novidades_ate: string; origem: string } | null;
};

const SELO_STATUS: Record<string, string> = {
  pago: "publicada",
  pendente: "em_breve",
  reembolsado: "arquivada",
  contestado: "arquivada",
  cancelado: "rascunho",
  expirado: "rascunho",
};

const STATUS_COMPRA: [string, string][] = [
  ["pago", "Pagos"],
  ["pendente", "Pendentes"],
  ["reembolsado", "Reembolsados"],
  ["contestado", "Chargeback"],
  ["cancelado", "Cancelados"],
  ["expirado", "Expirados"],
];
const POR_PAGINA = 20;
const ALUNOS_POR_PAGINA = 10;

export default async function Vendas({ searchParams }: PageProps<"/admin/vendas">) {
  const params = await searchParams;
  const { aviso } = params;
  const { supabase } = await exigirAdmin();
  // Pagamentos: q, status, tipo, pagina. Alunos: busca, palunos.
  const buscaPagamento = textoParam(params.q);
  const filtroStatus = STATUS_COMPRA.some(([v]) => v === textoParam(params.status)) ? textoParam(params.status) : "";
  const filtroTipo = ["compra", "renovacao"].includes(textoParam(params.tipo)) ? textoParam(params.tipo) : "";
  const paginaAtual = lerPagina(params.pagina);
  const buscaAluno = textoParam(params.busca);
  const termo = termoIlike(buscaAluno);
  const paginaAlunos = lerPagina(params.palunos);
  const termoPagamento = termoIlike(buscaPagamento);

  // Com busca, o join com perfis vira "inner" para filtrar pelo aluno.
  let consulta = supabase
    .from("compras")
    .select(
      `id, tipo, modalidade, parcelas, valor_total_centavos, status, criado_em, pago_em, perfis${termoPagamento ? "!inner" : ""}(nome, email)`,
      { count: "exact" },
    )
    .order("criado_em", { ascending: false })
    .range(...faixa(paginaAtual, POR_PAGINA));
  if (filtroStatus) consulta = consulta.eq("status", filtroStatus);
  if (filtroTipo) consulta = consulta.eq("tipo", filtroTipo);
  if (termoPagamento)
    consulta = consulta.or(`nome.ilike.%${termoPagamento}%,email.ilike.%${termoPagamento}%`, { referencedTable: "perfis" });

  const filtrosPagamentos = { q: buscaPagamento, status: filtroStatus, tipo: filtroTipo };
  const filtrosAlunos = { busca: buscaAluno, palunos: paginaAlunos > 1 ? paginaAlunos : null };

  const [
    { data: compras, count: totalCompras },
    { data: pagasMes },
    { count: totalAlunos },
    { count: comAcesso },
    { data: alunos, count: alunosEncontrados },
  ] =
    await Promise.all([
      consulta.overrideTypes<Compra[], { merge: false }>(),
      supabase
        .from("compras")
        .select("valor_total_centavos")
        .eq("status", "pago")
        .gte("pago_em", inicioDoMes().toISOString())
        .overrideTypes<{ valor_total_centavos: number }[], { merge: false }>(),
      supabase.from("perfis").select("id", { count: "exact", head: true }).eq("papel", "aluno"),
      supabase.from("acessos").select("usuario_id", { count: "exact", head: true }),
      termo
        ? supabase
            .from("perfis")
            .select("id, nome, email, criado_em, acessos(novidades_ate, origem)", { count: "exact" })
            .or(`email.ilike.%${termo}%,nome.ilike.%${termo}%`)
            .order("nome")
            .range(...faixa(paginaAlunos, ALUNOS_POR_PAGINA))
            .overrideTypes<Aluno[], { merge: false }>()
        : Promise.resolve({ data: [] as Aluno[], count: 0 }),
    ]);

  const receitaMes = (pagasMes ?? []).reduce((soma, c) => soma + c.valor_total_centavos, 0);

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · Vendas"
        titulo="Vendas e acessos"
        descricao="Pagamentos pelo Asaas. Estornos e chargebacks retiram o acesso automaticamente."
      />

      {typeof aviso === "string" && (
        <p className="rounded-2xl border-2 border-tinta bg-sky-50 p-3 text-sm text-sky-900">{aviso}</p>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Vendas no mês", `${formatarReais(receitaMes)} · ${pagasMes?.length ?? 0} pagamentos`],
          ["Alunos cadastrados", String(totalAlunos ?? 0)],
          ["Com acesso liberado", String(comAcesso ?? 0)],
        ].map(([titulo, valor]) => (
          <div key={titulo} className="rounded-2xl border-2 border-tinta bg-white p-4">
            <p className="text-xs text-slate-500">{titulo}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{valor}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-2xl border-2 border-tinta bg-white p-5">
        <h2 className="font-extrabold tracking-tight text-tinta">Alunos</h2>
        <BarraBusca
          acao="/admin/vendas"
          nome="busca"
          busca={buscaAluno}
          placeholder="Buscar aluno por nome ou e-mail"
          manter={filtrosPagamentos}
          limpar={Boolean(buscaAluno)}
        />
        {termo && (alunos ?? []).length === 0 && <p className="text-sm text-slate-600">Nenhum aluno encontrado.</p>}
        {termo && (
          <ResumoLista pagina={paginaAlunos} porPagina={ALUNOS_POR_PAGINA} total={alunosEncontrados ?? 0} nome={["aluno", "alunos"]} />
        )}
        <ul className="divide-y divide-slate-100">
          {(alunos ?? []).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{a.nome || a.email}</p>
                <p className="text-xs text-slate-500">
                  {a.email} · cadastro em {formatarData(a.criado_em)}
                </p>
              </div>
              {a.acessos ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">
                    Novidades até {formatarData(a.acessos.novidades_ate)} ({a.acessos.origem})
                  </span>
                  <form action={revogarAcesso}>
                    <input type="hidden" name="usuario_id" value={a.id} />
                    <button className={botaoPerigo}>Revogar</button>
                  </form>
                </div>
              ) : (
                <span className="text-xs text-slate-500">Sem acesso</span>
              )}
            </li>
          ))}
        </ul>
        <Paginacao
          acao="/admin/vendas"
          chave="palunos"
          pagina={paginaAlunos}
          totalPaginas={totalDePaginas(alunosEncontrados, ALUNOS_POR_PAGINA)}
          params={{ ...filtrosPagamentos, pagina: paginaAtual > 1 ? paginaAtual : null, busca: buscaAluno }}
          rolar={false}
        />

        <form action={liberarAcesso} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
          <label className="flex-1 space-y-1">
            <span className="text-sm font-medium text-slate-700">Liberar acesso manual (cortesia, parceria)</span>
            <input name="email" type="email" required placeholder="E-mail da conta do aluno" className={campo} />
          </label>
          <select name="meses" defaultValue="12" className={`${campo} w-auto`}>
            {[1, 3, 6, 12, 24].map((m) => (
              <option key={m} value={m}>
                {m} {m === 1 ? "mês" : "meses"}
              </option>
            ))}
          </select>
          <button className={botaoPrimario}>Liberar</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-extrabold tracking-tight text-tinta">Pagamentos</h2>
        <BarraBusca
          acao="/admin/vendas"
          busca={buscaPagamento}
          placeholder="Buscar pagamento pelo aluno"
          manter={filtrosAlunos}
          limpar={Boolean(buscaPagamento || filtroStatus || filtroTipo)}
        >
          <FiltroSelect nome="status" valor={filtroStatus} rotulo="Status" todos="Todos os status" opcoes={STATUS_COMPRA} />
          <FiltroSelect
            nome="tipo"
            valor={filtroTipo}
            rotulo="Tipo"
            todos="Compras e renovações"
            opcoes={[
              ["compra", "Compras"],
              ["renovacao", "Renovações"],
            ]}
          />
        </BarraBusca>
        <ResumoLista pagina={paginaAtual} porPagina={POR_PAGINA} total={totalCompras ?? 0} nome={["pagamento", "pagamentos"]} />
        <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
          {(compras ?? []).length === 0 && <li className="p-4 text-sm text-slate-600">Nenhum pagamento.</li>}
          {(compras ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <div>
                <p className="font-medium text-slate-900">{c.perfis.nome || c.perfis.email}</p>
                <p className="text-xs text-slate-500">
                  {c.tipo === "renovacao" ? "Renovação" : "Compra"} ·{" "}
                  {c.modalidade === "parcelado" ? `parcelado em até ${c.parcelas}x` : "à vista"} ·{" "}
                  {formatarData(c.pago_em ?? c.criado_em)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-900">{formatarReais(c.valor_total_centavos)}</span>
                <Selo status={SELO_STATUS[c.status] ?? "rascunho"} texto={c.status} />
              </div>
            </li>
          ))}
        </ul>
        <Paginacao
          acao="/admin/vendas"
          pagina={paginaAtual}
          totalPaginas={totalDePaginas(totalCompras, POR_PAGINA)}
          params={{ ...filtrosPagamentos, ...filtrosAlunos }}
          rolar={false}
        />
      </section>
    </div>
  );
}
