import Link from "next/link";
import { Selo } from "@/components/admin-ui";
import { CabecalhoPagina } from "@/components/sistema";
import { exigirAdmin } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import { formatarReais } from "@/lib/preco";
import { STATUS_SAQUE } from "./status";

type Saque = { id: string; valor_centavos: number; status: string; criado_em: string; afiliados: { nome: string } };


export default async function Saques() {
  const { supabase } = await exigirAdmin();
  const { data: saques } = await supabase
    .from("saques")
    .select("id, valor_centavos, status, criado_em, afiliados(nome)")
    .order("criado_em", { ascending: false })
    .limit(200)
    .overrideTypes<Saque[], { merge: false }>();
  const ordem = ["solicitado", "transferindo", "falhou", "pago", "recusado"];
  const lista = [...(saques ?? [])].sort((a, b) => ordem.indexOf(a.status) - ordem.indexOf(b.status));

  return (
    <div className="space-y-8">
      <Link href="/admin/afiliados" className="text-sm font-semibold text-slate-600 hover:text-tinta">
        ← Afiliados
      </Link>
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · Afiliados"
        titulo="Saques"
        descricao="Cada pedido passa pela conferência automática e pelo relatório antes do Pix."
      />
      <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
        {lista.length === 0 && <li className="p-4 text-sm text-slate-600">Nenhum pedido de saque.</li>}
        {lista.map((s) => (
          <li key={s.id}>
            <Link href={`/admin/afiliados/saques/${s.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50">
              <span>
                <strong className="text-slate-900">{s.afiliados.nome}</strong>
                <span className="block text-xs text-slate-500">pedido em {formatarData(s.criado_em)}</span>
              </span>
              <span className="flex items-center gap-3">
                <strong className="text-tinta">{formatarReais(s.valor_centavos)}</strong>
                <Selo status={STATUS_SAQUE[s.status]?.selo ?? "rascunho"} texto={STATUS_SAQUE[s.status]?.texto ?? s.status} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
