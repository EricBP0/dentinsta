import { botaoPerigo, botaoPrimario, botaoSecundario, campo, Selo } from "@/components/admin-ui";
import { exigirAdmin } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import { inicioDoMes } from "@/lib/ia/cota";
import { formatarReais } from "@/lib/preco";
import { liberarAcesso, revogarAcesso } from "./actions";

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

export default async function Vendas({ searchParams }: PageProps<"/admin/vendas">) {
  const { status, busca, aviso } = await searchParams;
  const { supabase } = await exigirAdmin();
  const filtroStatus = typeof status === "string" && status ? status : null;
  const termo = typeof busca === "string" ? busca.trim() : "";

  let consulta = supabase
    .from("compras")
    .select("id, tipo, modalidade, parcelas, valor_total_centavos, status, criado_em, pago_em, perfis(nome, email)")
    .order("criado_em", { ascending: false })
    .limit(100);
  if (filtroStatus) consulta = consulta.eq("status", filtroStatus);

  const [{ data: compras }, { data: pagasMes }, { count: totalAlunos }, { count: comAcesso }, { data: alunos }] =
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
            .select("id, nome, email, criado_em, acessos(novidades_ate, origem)")
            .or(`email.ilike.%${termo.replace(/[%,()]/g, "")}%,nome.ilike.%${termo.replace(/[%,()]/g, "")}%`)
            .limit(20)
            .overrideTypes<Aluno[], { merge: false }>()
        : Promise.resolve({ data: [] as Aluno[] }),
    ]);

  const receitaMes = (pagasMes ?? []).reduce((soma, c) => soma + c.valor_total_centavos, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-tinta">Vendas e acessos</h1>
        <p className="text-sm text-slate-600">Pagamentos pelo Asaas. Estornos e chargebacks retiram o acesso automaticamente.</p>
      </header>

      {typeof aviso === "string" && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{aviso}</p>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Vendas no mês", `${formatarReais(receitaMes)} · ${pagasMes?.length ?? 0} pagamentos`],
          ["Alunos cadastrados", String(totalAlunos ?? 0)],
          ["Com acesso liberado", String(comAcesso ?? 0)],
        ].map(([titulo, valor]) => (
          <div key={titulo} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{titulo}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{valor}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Alunos</h2>
        <form className="flex gap-2">
          <input name="busca" defaultValue={termo} placeholder="Buscar por nome ou e-mail" className={campo} />
          <button className={`${botaoSecundario} px-4`}>Buscar</button>
        </form>
        {termo && (alunos ?? []).length === 0 && <p className="text-sm text-slate-600">Nenhum aluno encontrado.</p>}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Pagamentos</h2>
          <form className="flex gap-2">
            <select name="status" defaultValue={filtroStatus ?? ""} className={`${campo} w-auto`}>
              <option value="">Todos</option>
              <option value="pago">Pagos</option>
              <option value="pendente">Pendentes</option>
              <option value="reembolsado">Reembolsados</option>
              <option value="contestado">Chargeback</option>
              <option value="cancelado">Cancelados</option>
              <option value="expirado">Expirados</option>
            </select>
            <button className={`${botaoSecundario} px-4`}>Filtrar</button>
          </form>
        </div>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
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
      </section>
    </div>
  );
}
