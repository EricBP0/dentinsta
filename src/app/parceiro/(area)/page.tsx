import { CabecalhoPagina } from "@/components/sistema";
import { Copiar } from "@/components/copiar";
import { exigirAfiliado } from "@/lib/afiliado-conta";
import { CARENCIA_DIAS, nomeReservado, SAQUE_MINIMO_CENTAVOS, TIPOS_PIX, type TipoPix } from "@/lib/afiliados";
import { formatarData } from "@/lib/catalogo";
import { PLANOS, type Ciclo, type Plano } from "@/lib/planos";
import { formatarReais } from "@/lib/preco";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { urlDoSite } from "@/lib/url";
import { BotaoSaque, FormularioPix } from "./formularios";

type Comissao = {
  id: string;
  cliente_id: string;
  valor_base_centavos: number;
  valor_centavos: number;
  status: "pendente" | "em_saque" | "paga" | "cancelada";
  liberada_em: string;
  motivo: string | null;
  criado_em: string;
  compras: { plano: Plano | null; ciclo: Ciclo | null; tipo: "compra" | "renovacao" } | null;
};
type Saque = { id: string; valor_centavos: number; status: string; motivo: string | null; criado_em: string; pago_em: string | null };

const STATUS_SAQUE: Record<string, string> = {
  solicitado: "Em análise",
  transferindo: "Pix em andamento",
  pago: "Pago",
  falhou: "Pix falhou (o valor voltou ao saldo)",
  recusado: "Recusado",
};

/** Resultados do afiliado: link, cupom, cliques, vendas, comissões e saques. */
export default async function PainelParceiro() {
  const { afiliado } = await exigirAfiliado();
  if (!afiliado) return null; // o layout já mostra o aviso
  const admin = criarClienteAdmin();
  const agora = new Date();
  const ha30dias = new Date(agora.getTime() - 30 * 864e5).toISOString();

  const [{ count: cliques }, { count: cliques30 }, { data: comissoes }, { data: saques }, site] = await Promise.all([
    admin.from("afiliado_cliques").select("id", { count: "exact", head: true }).eq("afiliado_id", afiliado.id),
    admin.from("afiliado_cliques").select("id", { count: "exact", head: true }).eq("afiliado_id", afiliado.id).gte("criado_em", ha30dias),
    admin
      .from("comissoes")
      .select("id, cliente_id, valor_base_centavos, valor_centavos, status, liberada_em, motivo, criado_em, compras(plano, ciclo, tipo)")
      .eq("afiliado_id", afiliado.id)
      .order("criado_em", { ascending: false })
      .overrideTypes<Comissao[], { merge: false }>(),
    admin
      .from("saques")
      .select("id, valor_centavos, status, motivo, criado_em, pago_em")
      .eq("afiliado_id", afiliado.id)
      .order("criado_em", { ascending: false })
      .limit(20)
      .overrideTypes<Saque[], { merge: false }>(),
    urlDoSite(),
  ]);
  const lista = comissoes ?? [];
  const ids = [...new Set(lista.map((c) => c.cliente_id))];
  const { data: clientes } = ids.length
    ? await admin.from("perfis").select("id, nome").in("id", ids).overrideTypes<{ id: string; nome: string }[], { merge: false }>()
    : { data: [] };
  // O afiliado vê só o primeiro nome e a inicial dos clientes.
  const nomes = new Map((clientes ?? []).map((c) => [c.id, nomeReservado(c.nome)]));

  const soma = (filtro: (c: Comissao) => boolean) => lista.filter(filtro).reduce((s, c) => s + c.valor_centavos, 0);
  const liberada = (c: Comissao) => new Date(c.liberada_em).getTime() <= agora.getTime();
  const emCarencia = soma((c) => c.status === "pendente" && !liberada(c));
  const disponivel = soma((c) => c.status === "pendente" && liberada(c));
  const emSaque = soma((c) => c.status === "em_saque");
  const pagas = soma((c) => c.status === "paga");
  const vendas = lista.filter((c) => c.compras?.tipo === "compra" && c.status !== "cancelada").length;
  const saqueAberto = (saques ?? []).some((s) => s.status === "solicitado" || s.status === "transferindo");
  const motivoSemSaque = saqueAberto
    ? "Você tem um saque em análise"
    : !afiliado.chave_pix
      ? "Cadastre sua chave Pix para sacar"
      : disponivel < SAQUE_MINIMO_CENTAVOS
        ? `Saque a partir de ${formatarReais(SAQUE_MINIMO_CENTAVOS)} disponíveis`
        : null;

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        tom="tinta"
        rotulo="Parceiros · Resultados"
        titulo={`Olá, ${afiliado.nome.split(" ")[0]}!`}
        descricao={`Você ganha ${Number(afiliado.comissao_pct).toLocaleString("pt-BR")}% de cada pagamento dos clientes que indicar, enquanto eles assinarem.`}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0 space-y-2 rounded-2xl border-2 border-tinta bg-white p-5">
          <p className="text-sm font-semibold text-tinta">Seu link</p>
          <Copiar texto={`${site}/r/${afiliado.codigo}`} rotulo="link" />
          <p className="text-xs text-slate-500">Quem entra pelo link fica marcado como seu por 30 dias{afiliado.cupom && " e já ganha o desconto do cupom"}.</p>
        </div>
        <div className="min-w-0 space-y-2 rounded-2xl border-2 border-tinta bg-white p-5">
          <p className="text-sm font-semibold text-tinta">Seu cupom</p>
          {afiliado.cupom ? (
            <>
              <Copiar texto={afiliado.cupom} rotulo="cupom" />
              <p className="text-xs text-slate-500">
                {Number(afiliado.desconto_pct).toLocaleString("pt-BR")}% de desconto na primeira cobrança de quem usar.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-600">Ainda sem cupom. Fale com a equipe.</p>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Numero rotulo="Cliques no link (30 dias)" valor={String(cliques30 ?? 0)} detalhe={`${cliques ?? 0} no total`} />
        <Numero rotulo="Vendas" valor={String(vendas)} detalhe={`${ids.length} cliente(s) indicado(s)`} />
        <Numero rotulo="Já recebido" valor={formatarReais(pagas)} />
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_20rem]">
        <div className="grid gap-3 sm:grid-cols-3">
          <Numero rotulo={`Em carência (${CARENCIA_DIAS} dias)`} valor={formatarReais(emCarencia)} detalhe="Aguardando o prazo de estorno" />
          <Numero rotulo="Disponível para saque" valor={formatarReais(disponivel)} destaque />
          <Numero rotulo="Em saque" valor={formatarReais(emSaque)} />
        </div>
        <div className="space-y-3 rounded-2xl border-2 border-tinta bg-white p-5">
          <BotaoSaque texto={`Pedir saque de ${formatarReais(disponivel)}`} desabilitado={Boolean(motivoSemSaque)} />
          {motivoSemSaque && <p className="text-center text-xs text-slate-500">{motivoSemSaque}</p>}
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border-2 border-tinta bg-white p-5">
        <p className="text-sm font-semibold text-tinta">Chave Pix para receber</p>
        {afiliado.chave_pix && (
          <p className="text-xs text-slate-500">
            Atual: {TIPOS_PIX[afiliado.tipo_chave_pix as TipoPix] ?? afiliado.tipo_chave_pix} · {afiliado.chave_pix}
          </p>
        )}
        <FormularioPix tipo={afiliado.tipo_chave_pix} chave={afiliado.chave_pix} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold tracking-tight text-tinta">Comissões</h2>
        <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
          {lista.length === 0 && <li className="p-4 text-sm text-slate-600">Nenhuma venda ainda. Divulgue seu link e seu cupom!</li>}
          {lista.slice(0, 100).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <div>
                <p className="font-medium text-slate-900">
                  {nomes.get(c.cliente_id) ?? "Cliente"} ·{" "}
                  {c.compras?.plano ? PLANOS[c.compras.plano].nome : "Plano"}
                  {c.compras?.ciclo === "anual" ? " anual" : " mensal"}
                  {c.compras?.tipo === "renovacao" && " (renovação)"}
                </p>
                <p className="text-xs text-slate-500">
                  {formatarData(c.criado_em)} · pagamento de {formatarReais(c.valor_base_centavos)}
                  {c.motivo && ` · ${c.motivo}`}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${c.status === "cancelada" ? "text-slate-400 line-through" : "text-tinta"}`}>
                  {formatarReais(c.valor_centavos)}
                </p>
                <p className="text-xs text-slate-500">
                  {c.status === "pendente"
                    ? liberada(c)
                      ? "Disponível"
                      : `Libera em ${formatarData(c.liberada_em)}`
                    : { em_saque: "Em saque", paga: "Paga", cancelada: "Cancelada" }[c.status]}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {(saques ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold tracking-tight text-tinta">Saques</h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
            {(saques ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span>
                  {formatarData(s.criado_em)} · {STATUS_SAQUE[s.status] ?? s.status}
                  {s.motivo && <span className="block text-xs text-slate-500">{s.motivo}</span>}
                </span>
                <strong className="text-tinta">{formatarReais(s.valor_centavos)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Numero({ rotulo, valor, detalhe, destaque = false }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl border-2 border-tinta p-4 ${destaque ? "bg-lima/40" : "bg-white"}`}>
      <p className="text-xs text-slate-500">{rotulo}</p>
      <p className="text-2xl font-extrabold text-tinta">{valor}</p>
      {detalhe && <p className="text-xs text-slate-500">{detalhe}</p>}
    </div>
  );
}
