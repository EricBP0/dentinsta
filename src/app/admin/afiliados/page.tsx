import Link from "next/link";
import { Selo } from "@/components/admin-ui";
import { CabecalhoPagina } from "@/components/sistema";
import { COLUNAS_AFILIADO, type Afiliado } from "@/lib/afiliado-conta";
import { exigirAdmin } from "@/lib/auth";
import { formatarReais } from "@/lib/preco";
import { criarAfiliado } from "./actions";
import { FormularioAfiliado } from "./formulario";

type Comissao = { afiliado_id: string; valor_centavos: number; status: string; liberada_em: string; cliente_id: string };

/** Afiliados: cadastro, link, cupom e resultados de cada um. */
export default async function Afiliados() {
  const { supabase } = await exigirAdmin();
  const [{ data: afiliados }, { data: comissoes }, { count: saquesAbertos }] = await Promise.all([
    supabase.from("afiliados").select(COLUNAS_AFILIADO).order("criado_em", { ascending: false }).overrideTypes<Afiliado[], { merge: false }>(),
    supabase.from("comissoes").select("afiliado_id, valor_centavos, status, liberada_em, cliente_id").overrideTypes<Comissao[], { merge: false }>(),
    supabase.from("saques").select("id", { count: "exact", head: true }).eq("status", "solicitado"),
  ]);
  const agora = new Date();
  const resumo = (id: string) => {
    const deste = (comissoes ?? []).filter((c) => c.afiliado_id === id);
    const soma = (f: (c: Comissao) => boolean) => deste.filter(f).reduce((s, c) => s + c.valor_centavos, 0);
    return {
      clientes: new Set(deste.map((c) => c.cliente_id)).size,
      aPagar: soma((c) => c.status === "pendente" || c.status === "em_saque"),
      liberado: soma((c) => c.status === "pendente" && new Date(c.liberada_em) <= agora),
      pago: soma((c) => c.status === "paga"),
    };
  };

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · Afiliados"
        titulo="Afiliados"
        descricao="Cada afiliado tem um link e um cupom. Cada pagamento dos clientes indicados gera comissão, liberada para saque depois de 30 dias."
      >
        <Link href="/admin/afiliados/saques" className="inline-flex items-center gap-2 rounded-full border-2 border-lima px-4 py-2 text-sm font-bold text-lima hover:bg-lima hover:text-tinta">
          Saques{saquesAbertos ? ` · ${saquesAbertos} para analisar` : ""}
        </Link>
      </CabecalhoPagina>

      <details className="rounded-2xl border-2 border-tinta bg-white p-5" open={(afiliados ?? []).length === 0}>
        <summary className="cursor-pointer font-extrabold tracking-tight text-tinta">Novo afiliado</summary>
        <div className="mt-4">
          <FormularioAfiliado acao={criarAfiliado} />
        </div>
      </details>

      <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
        {(afiliados ?? []).length === 0 && <li className="p-4 text-sm text-slate-600">Nenhum afiliado ainda.</li>}
        {(afiliados ?? []).map((a) => {
          const r = resumo(a.id);
          return (
            <li key={a.id}>
              <Link href={`/admin/afiliados/${a.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50">
                <div>
                  <p className="font-medium text-slate-900">
                    {a.nome} {!a.ativo && <Selo status="arquivada" texto="Pausado" />}
                  </p>
                  <p className="text-xs text-slate-500">
                    /r/{a.codigo} · cupom {a.cupom ?? "—"} · {Number(a.comissao_pct).toLocaleString("pt-BR")}% de comissão ·{" "}
                    {Number(a.desconto_pct).toLocaleString("pt-BR")}% de desconto
                  </p>
                </div>
                <p className="text-right text-xs text-slate-600">
                  {r.clientes} cliente(s) · a pagar {formatarReais(r.aPagar)} ({formatarReais(r.liberado)} liberado) · pago {formatarReais(r.pago)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
