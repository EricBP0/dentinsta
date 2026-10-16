import Link from "next/link";
import { notFound } from "next/navigation";
import { botaoSecundario } from "@/components/admin-ui";
import { Copiar } from "@/components/copiar";
import { CabecalhoPagina } from "@/components/sistema";
import { COLUNAS_AFILIADO, type Afiliado } from "@/lib/afiliado-conta";
import { TIPOS_PIX, type TipoPix } from "@/lib/afiliados";
import { exigirAdmin } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import { PLANOS, type Ciclo, type Plano } from "@/lib/planos";
import { formatarReais } from "@/lib/preco";
import { urlDoSite } from "@/lib/url";
import { atualizarAfiliado, reenviarAcesso } from "../actions";
import { FormularioAfiliado } from "../formulario";

type Comissao = {
  id: string;
  valor_base_centavos: number;
  valor_centavos: number;
  status: string;
  liberada_em: string;
  motivo: string | null;
  estornada_apos_pagamento: boolean;
  criado_em: string;
  perfis: { nome: string; email: string } | null;
  compras: { plano: Plano | null; ciclo: Ciclo | null; tipo: string; status: string } | null;
};

const AVISOS: Record<string, string> = {
  criado: "Afiliado cadastrado. Enviamos o e-mail para ele criar a senha da área de parceiros.",
  acesso: "Enviamos de novo o e-mail para criar a senha.",
};

export default async function DetalheAfiliado({ params, searchParams }: PageProps<"/admin/afiliados/[id]">) {
  const { id } = await params;
  const { aviso } = await searchParams;
  const { supabase } = await exigirAdmin();
  const [{ data: afiliado }, { data: comissoes }, { count: cliques }, site] = await Promise.all([
    supabase.from("afiliados").select(COLUNAS_AFILIADO).eq("id", id).maybeSingle<Afiliado>(),
    supabase
      .from("comissoes")
      .select("id, valor_base_centavos, valor_centavos, status, liberada_em, motivo, estornada_apos_pagamento, criado_em, perfis(nome, email), compras(plano, ciclo, tipo, status)")
      .eq("afiliado_id", id)
      .order("criado_em", { ascending: false })
      .limit(200)
      .overrideTypes<Comissao[], { merge: false }>(),
    supabase.from("afiliado_cliques").select("id", { count: "exact", head: true }).eq("afiliado_id", id),
    urlDoSite(),
  ]);
  if (!afiliado) notFound();
  const estornadasPagas = (comissoes ?? []).filter((c) => c.estornada_apos_pagamento);

  return (
    <div className="space-y-8">
      <Link href="/admin/afiliados" className="text-sm font-semibold text-slate-600 hover:text-tinta">
        ← Afiliados
      </Link>
      <CabecalhoPagina tom="tinta" rotulo="Backoffice · Afiliados" titulo={afiliado.nome} descricao={`${cliques ?? 0} cliques no link`}>
        <form action={reenviarAcesso}>
          <input type="hidden" name="id" value={afiliado.id} />
          <button className="rounded-full border-2 border-lima px-4 py-2 text-sm font-bold text-lima hover:bg-lima hover:text-tinta">
            Reenviar acesso
          </button>
        </form>
      </CabecalhoPagina>
      {typeof aviso === "string" && AVISOS[aviso] && (
        <p className="rounded-2xl border-2 border-tinta bg-sky-50 p-3 text-sm text-sky-900">{AVISOS[aviso]}</p>
      )}
      {estornadasPagas.length > 0 && (
        <p className="rounded-2xl border-2 border-tinta bg-red-50 p-3 text-sm text-red-900">
          {estornadasPagas.length} comissão(ões) foram estornadas depois de pagas (
          {formatarReais(estornadasPagas.reduce((s, c) => s + c.valor_centavos, 0))}). Combine o desconto com o afiliado.
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0 space-y-2 rounded-2xl border-2 border-tinta bg-white p-5">
          <p className="text-sm font-semibold text-tinta">Link</p>
          <Copiar texto={`${site}/r/${afiliado.codigo}`} rotulo="link" />
          <p className="text-xs text-slate-500">
            Chave Pix: {afiliado.chave_pix ? `${TIPOS_PIX[afiliado.tipo_chave_pix as TipoPix] ?? ""} ${afiliado.chave_pix}` : "não cadastrada"}
            {afiliado.chave_pix_alterada_em && ` (alterada em ${formatarData(afiliado.chave_pix_alterada_em)})`}
          </p>
        </div>
        <div className="min-w-0 space-y-2 rounded-2xl border-2 border-tinta bg-white p-5">
          <p className="text-sm font-semibold text-tinta">Cupom</p>
          {afiliado.cupom ? <Copiar texto={afiliado.cupom} rotulo="cupom" /> : <p className="text-sm text-slate-600">Sem cupom.</p>}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-tinta bg-white p-5">
        <FormularioAfiliado acao={atualizarAfiliado} inicial={afiliado} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight text-tinta">Comissões</h2>
          <Link href="/admin/afiliados/saques" className={botaoSecundario}>
            Saques
          </Link>
        </div>
        <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
          {(comissoes ?? []).length === 0 && <li className="p-4 text-sm text-slate-600">Nenhuma comissão ainda.</li>}
          {(comissoes ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <div>
                <p className="font-medium text-slate-900">
                  {c.perfis?.nome || c.perfis?.email} · {c.compras?.plano ? PLANOS[c.compras.plano].nome : ""} {c.compras?.ciclo}
                  {c.compras?.tipo === "renovacao" && " (renovação)"}
                </p>
                <p className="text-xs text-slate-500">
                  {formatarData(c.criado_em)} · pagamento {formatarReais(c.valor_base_centavos)} ({c.compras?.status}) · libera em{" "}
                  {formatarData(c.liberada_em)}
                  {c.motivo && ` · ${c.motivo}`}
                </p>
              </div>
              <p className="text-right">
                <strong className={c.status === "cancelada" ? "text-slate-400 line-through" : "text-tinta"}>{formatarReais(c.valor_centavos)}</strong>
                <span className="block text-xs text-slate-500">{c.status.replace("_", " ")}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
