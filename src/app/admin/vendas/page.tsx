import { botaoPerigo, botaoPrimario, campo, Selo } from "@/components/admin-ui";
import { exigirAdmin } from "@/lib/auth";
import { faixa, lerPagina, termoIlike, textoParam, totalDePaginas } from "@/lib/listagem";
import { BarraBusca, FiltroSelect, Paginacao, ResumoLista } from "@/components/listagem";
import { formatarData } from "@/lib/catalogo";
import { inicioDoMes } from "@/lib/ia/cota";
import { formatarReais } from "@/lib/preco";
import { PLANOS, type Ciclo, type Plano } from "@/lib/planos";
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
  plano: Plano | null;
  ciclo: Ciclo | null;
  perfis: { nome: string; email: string };
};

type AssinaturaResumo = { plano: Plano; ciclo: Ciclo; status: string; ativa_ate: string | null; origem: string; valor_centavos: number };
type Aluno = {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
  assinaturas: AssinaturaResumo[];
};

const valida = (a: AssinaturaResumo, agora: Date) =>
  (a.status === "ativa" || a.status === "cancelada") && a.ativa_ate !== null && new Date(a.ativa_ate) >= agora;

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
      `id, tipo, modalidade, parcelas, valor_total_centavos, status, criado_em, pago_em, plano, ciclo, perfis${termoPagamento ? "!inner" : ""}(nome, email)`,
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
    { data: vigentes },
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
      supabase
        .from("assinaturas")
        .select("plano, ciclo, status, ativa_ate, origem, valor_centavos")
        .in("status", ["ativa", "cancelada"])
        .gte("ativa_ate", new Date().toISOString())
        .overrideTypes<AssinaturaResumo[], { merge: false }>(),
      termo
        ? supabase
            .from("perfis")
            .select(
              "id, nome, email, criado_em, assinaturas!assinaturas_usuario_id_fkey(plano, ciclo, status, ativa_ate, origem, valor_centavos)",
              { count: "exact" },
            )
            .or(`email.ilike.%${termo}%,nome.ilike.%${termo}%`)
            .order("nome")
            .range(...faixa(paginaAlunos, ALUNOS_POR_PAGINA))
            .overrideTypes<Aluno[], { merge: false }>()
        : Promise.resolve({ data: [] as Aluno[], count: 0 }),
    ]);

  const receitaMes = (pagasMes ?? []).reduce((soma, c) => soma + c.valor_total_centavos, 0);
  const agora = new Date();
  // Receita recorrente por mês: mensais que vão renovar + anuais divididos por 12.
  // Assinantes: mensais que vão renovar e anuais no período pago.
  const pagantes = (vigentes ?? []).filter((a) => a.origem === "asaas" && (a.status === "ativa" || a.ciclo === "anual"));
  const canceladas = (vigentes ?? []).filter((a) => a.origem === "asaas" && a.status === "cancelada" && a.ciclo === "mensal").length;
  const mrr = pagantes.reduce((soma, a) => soma + (a.ciclo === "anual" ? Math.round(a.valor_centavos / 12) : a.valor_centavos), 0);
  const porPlano = (Object.keys(PLANOS) as Plano[])
    .map((p) => `${PLANOS[p].nome} ${pagantes.filter((a) => a.plano === p).length}`)
    .join(" · ");

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · Vendas"
        titulo="Vendas e assinaturas"
        descricao="Pagamentos pelo Asaas. Estornos e chargebacks retiram o acesso automaticamente."
      />

      {typeof aviso === "string" && (
        <p className="rounded-2xl border-2 border-tinta bg-sky-50 p-3 text-sm text-sky-900">{aviso}</p>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Vendas no mês", `${formatarReais(receitaMes)} · ${pagasMes?.length ?? 0} pagamentos`],
          [
            "Receita recorrente (por mês)",
            `${formatarReais(mrr)} · ${pagantes.length} ${pagantes.length === 1 ? "assinante" : "assinantes"} (${porPlano})${
              canceladas ? ` · ${canceladas} não ${canceladas === 1 ? "renova" : "renovam"}` : ""
            }`,
          ],
          [
            "Alunos cadastrados",
            `${totalAlunos ?? 0} · ${(vigentes ?? []).filter((a) => a.origem === "manual").length} com cortesia`,
          ],
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
              {a.assinaturas.some((x) => valida(x, agora)) ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">
                    {a.assinaturas
                      .filter((x) => valida(x, agora))
                      .map(
                        (x) =>
                          `${PLANOS[x.plano].nome} ${x.ciclo}${x.origem === "manual" ? " (cortesia)" : x.status === "cancelada" ? " (não renova)" : ""} até ${formatarData(x.ativa_ate!)}`,
                      )
                      .join(" · ")}
                  </span>
                  <form action={revogarAcesso}>
                    <input type="hidden" name="usuario_id" value={a.id} />
                    <button className={botaoPerigo} title="Corta o acesso na hora. Cancele também a cobrança no Asaas, se houver.">
                      Revogar
                    </button>
                  </form>
                </div>
              ) : (
                <span className="text-xs text-slate-500">Sem assinatura</span>
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
            <span className="text-sm font-medium text-slate-700">Liberar plano manual (cortesia, parceria)</span>
            <input name="email" type="email" required placeholder="E-mail da conta do aluno" className={campo} />
          </label>
          <select name="plano" defaultValue="completo" className={`${campo} w-auto`}>
            {(Object.keys(PLANOS) as Plano[]).map((p) => (
              <option key={p} value={p}>
                {PLANOS[p].nome}
              </option>
            ))}
          </select>
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
            todos="Todos os pagamentos"
            opcoes={[
              ["compra", "Primeiros pagamentos"],
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
                  {c.plano ? `${PLANOS[c.plano].nome} ${c.ciclo ?? ""} · ` : ""}
                  {c.tipo === "renovacao" ? "Renovação" : "1º pagamento"} ·{" "}
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
