import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { BarraBusca, FiltroSelect } from "@/components/listagem";
import { CabecalhoPagina } from "@/components/sistema";
import { exigirAdmin } from "@/lib/auth";
import { formatarTelefone, linkWhatsApp } from "@/lib/cadastro";
import { formatarData } from "@/lib/catalogo";
import { termoIlike, textoParam } from "@/lib/listagem";
import { nomeDaEscolha, type Ciclo, type Modulo, type Plano } from "@/lib/planos";
import { formatarReais } from "@/lib/preco";

type Lead = { id: string; nome: string; email: string; telefone: string; usuario_id: string | null; criado_em: string };
type Checkout = {
  id: string;
  usuario_id: string;
  plano: Plano;
  ciclo: Ciclo;
  modulos: Modulo[];
  valor_centavos: number;
  criado_em: string;
  perfis: { nome: string; email: string; telefone: string | null };
};

const LIMITE = 100;
const DIAS_CARRINHO = 30;

/** Quem deixou o contato e não assinou, e quem abriu o pagamento e não pagou: para recuperar a venda. */
export default async function Leads({ searchParams }: PageProps<"/admin/vendas/leads">) {
  const params = await searchParams;
  const { supabase } = await exigirAdmin();
  const busca = textoParam(params.q);
  const termo = termoIlike(busca);
  const situacao = textoParam(params.situacao) === "todos" ? "todos" : "";

  let consultaLeads = supabase
    .from("leads")
    .select("id, nome, email, telefone, usuario_id, criado_em")
    .order("criado_em", { ascending: false })
    .limit(LIMITE);
  if (termo) consultaLeads = consultaLeads.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%`);

  const agora = new Date();
  const desde = new Date(agora.getTime() - DIAS_CARRINHO * 864e5).toISOString();
  const [{ data: leads }, { data: checkouts }, { data: pagantes }] = await Promise.all([
    consultaLeads.overrideTypes<Lead[], { merge: false }>(),
    supabase
      .from("assinaturas")
      .select("id, usuario_id, plano, ciclo, modulos, valor_centavos, criado_em, perfis!assinaturas_usuario_id_fkey(nome, email, telefone)")
      .in("status", ["pendente", "encerrada"])
      .eq("origem", "asaas")
      .is("periodo_ate", null)
      .gte("criado_em", desde)
      .order("criado_em", { ascending: false })
      .limit(LIMITE)
      .overrideTypes<Checkout[], { merge: false }>(),
    // Quem tem assinatura valendo agora (sai das duas listas). Ex-assinante que
    // abriu o pagamento e não pagou continua: é venda a recuperar.
    supabase
      .from("assinaturas")
      .select("usuario_id")
      .in("status", ["ativa", "cancelada"])
      .gte("ativa_ate", agora.toISOString())
      .overrideTypes<{ usuario_id: string }[], { merge: false }>(),
  ]);
  const pagou = new Set((pagantes ?? []).map((p) => p.usuario_id));
  const listaLeads = (leads ?? []).filter((l) => situacao === "todos" || !l.usuario_id || !pagou.has(l.usuario_id));

  // Um carrinho por pessoa (o mais recente), só de quem não está assinando agora.
  const vistos = new Set<string>();
  const carrinhos = (checkouts ?? []).filter((c) => {
    if (pagou.has(c.usuario_id) || vistos.has(c.usuario_id)) return false;
    vistos.add(c.usuario_id);
    return !termo || `${c.perfis.nome} ${c.perfis.email}`.toLowerCase().includes(busca.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <Link href="/admin/vendas" className="text-sm font-semibold text-slate-600 hover:text-tinta">
        ← Vendas
      </Link>
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · Vendas"
        titulo="Leads e carrinhos"
        descricao="Quem deixou o contato no “Quero conhecer” e quem abriu o pagamento sem pagar. Chame no WhatsApp para recuperar a venda."
      />
      <BarraBusca acao="/admin/vendas/leads" busca={busca} placeholder="Buscar por nome ou e-mail" limpar={Boolean(busca || situacao)}>
        <FiltroSelect nome="situacao" valor={situacao} rotulo="Situação" todos="Leads que não assinaram" opcoes={[["todos", "Todos os leads"]]} />
      </BarraBusca>

      <Secao titulo={`Carrinhos abandonados (últimos ${DIAS_CARRINHO} dias)`} vazio="Nenhum carrinho abandonado.">
        {carrinhos.map((c) => (
          <Linha
            key={c.id}
            nome={c.perfis.nome || c.perfis.email}
            email={c.perfis.email}
            telefone={c.perfis.telefone}
            detalhe={`${nomeDaEscolha(c)} · ${formatarReais(c.valor_centavos)} · ${formatarData(c.criado_em)}`}
          />
        ))}
      </Secao>

      <Secao titulo="Leads do “Quero conhecer”" vazio="Nenhum lead ainda.">
        {listaLeads.map((l) => (
          <Linha
            key={l.id}
            nome={l.nome}
            email={l.email}
            telefone={l.telefone}
            detalhe={`${formatarData(l.criado_em)}${l.usuario_id && pagou.has(l.usuario_id) ? " · assinante" : l.usuario_id ? " · abriu o pagamento" : ""}`}
          />
        ))}
      </Secao>
    </div>
  );
}

function Secao({ titulo, vazio, children }: { titulo: string; vazio: string; children: React.ReactNode[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-extrabold tracking-tight text-tinta">
        {titulo} <span className="text-sm font-normal text-slate-500">({children.length})</span>
      </h2>
      <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
        {children.length ? children : <li className="p-4 text-sm text-slate-600">{vazio}</li>}
      </ul>
    </section>
  );
}

function Linha({ nome, email, telefone, detalhe }: { nome: string; email: string; telefone: string | null; detalhe: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{nome}</p>
        <p className="text-xs text-slate-500">
          {email}
          {telefone && ` · ${formatarTelefone(telefone)}`} · {detalhe}
        </p>
      </div>
      {telefone && (
        <a
          href={linkWhatsApp(telefone)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-tinta px-3 py-1.5 text-xs font-bold text-tinta hover:bg-lima"
        >
          <MessageCircle className="size-3.5" /> WhatsApp
        </a>
      )}
    </li>
  );
}
