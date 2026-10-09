import { CalendarClock, Check, CreditCard, Mail, Users } from "lucide-react";
import Link from "next/link";
import { CabecalhoPagina } from "@/components/sistema";
import { exigirLogin } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import { textoParam } from "@/lib/listagem";
import { formatarReais } from "@/lib/preco";
import {
  AVULSOS,
  MODULOS,
  montarEscolha,
  nomeDaEscolha,
  PLANOS,
  PRECO_MENSAL,
  TODOS_MODULOS,
  type Ciclo,
  type Modulo,
  type Plano,
} from "@/lib/planos";
import { cancelarAssinatura, definirConvidado, desfazerReducao, trocarPlano } from "./actions";

type Assinatura = {
  id: string;
  usuario_id: string;
  plano: Plano;
  modulos: Modulo[];
  ciclo: Ciclo;
  valor_centavos: number;
  status: "pendente" | "ativa" | "cancelada" | "encerrada";
  origem: "asaas" | "manual";
  periodo_ate: string | null;
  ativa_ate: string | null;
  plano_proximo: Plano | null;
  modulos_proximos: Modulo[] | null;
  convidado_email: string | null;
  convidado_id: string | null;
  convidado_trocado_em: string | null;
  gateway_assinatura_id: string | null;
};
type Pagamento = { id: string; valor_total_centavos: number; status: string; pago_em: string | null; criado_em: string; plano: string | null };

const AVISOS: Record<string, [string, "ok" | "erro"]> = {
  plano_trocado: ["Plano trocado! Os módulos novos já estão liberados; o novo valor vem na próxima cobrança.", "ok"],
  troca_agendada: ["Combinado: a mudança entra na próxima cobrança. Até lá, você continua com tudo do plano atual.", "ok"],
  reducao_desfeita: ["Pronto, você continua no plano atual.", "ok"],
  cancelada: ["Assinatura cancelada. Você continua usando até o fim do período pago.", "ok"],
  convite_salvo: ["Convite salvo. Avise a pessoa para entrar (ou criar a conta) com esse e-mail.", "ok"],
  convite_removido: ["A segunda pessoa foi removida do plano.", "ok"],
  ja_assina: ["Você já tem uma assinatura ativa. Para mudar, troque de plano aqui.", "ok"],
  sem_mudanca: ["Esse já é o seu plano.", "erro"],
  aguarde_confirmacao: ["Aguarde a confirmação do primeiro pagamento para trocar de plano.", "erro"],
  sem_assinatura: ["Não encontramos uma assinatura mensal ativa na sua conta.", "erro"],
  plano_invalido: ["Escolha um plano válido.", "erro"],
  confirme: ["Marque a confirmação para cancelar.", "erro"],
  sem_duplo: ["Só o titular de um plano Duplo pode convidar.", "erro"],
  email_invalido: ["Confira o e-mail digitado.", "erro"],
  convite_proprio: ["Use o e-mail da outra pessoa, não o seu.", "erro"],
  troca_recente: ["A segunda pessoa só pode ser trocada uma vez a cada 30 dias.", "erro"],
  falha: ["Não foi possível concluir agora. Tente de novo em instantes.", "erro"],
};

export default async function MinhaAssinatura({ searchParams }: PageProps<"/aluno/assinatura">) {
  const aviso = AVISOS[textoParam((await searchParams).aviso)];
  const { supabase, perfil } = await exigirLogin();
  const [{ data: assinaturas }, { data: pagamentos }] = await Promise.all([
    supabase
      .from("assinaturas")
      .select(
        "id, usuario_id, plano, modulos, ciclo, valor_centavos, status, origem, periodo_ate, ativa_ate, plano_proximo, modulos_proximos, convidado_email, convidado_id, convidado_trocado_em, gateway_assinatura_id",
      )
      .or(`usuario_id.eq.${perfil.id},convidado_id.eq.${perfil.id}`)
      .in("status", ["ativa", "cancelada"])
      .gte("ativa_ate", new Date().toISOString())
      .order("ativa_ate", { ascending: false })
      .overrideTypes<Assinatura[], { merge: false }>(),
    supabase
      .from("compras")
      .select("id, valor_total_centavos, status, pago_em, criado_em, plano")
      .eq("usuario_id", perfil.id)
      .neq("status", "pendente")
      .order("criado_em", { ascending: false })
      .limit(12)
      .overrideTypes<Pagamento[], { merge: false }>(),
  ]);
  const a = assinaturas?.[0];
  const agora = new Date();

  return (
    <div className="space-y-8">
      <CabecalhoPagina rotulo="Lab · Conta" titulo="Minha assinatura" />

      {aviso && (
        <p
          className={`rounded-2xl border-2 border-tinta p-4 text-sm ${aviso[1] === "ok" ? "bg-lima/40 text-tinta" : "bg-red-50 text-red-800"}`}
        >
          {aviso[0]}
        </p>
      )}

      {!a ? (
        <section className="space-y-3 rounded-2xl border-2 border-tinta bg-white p-6 text-center">
          <p className="text-slate-700">Você não tem uma assinatura ativa.</p>
          <Link href="/assinar" className="inline-block rounded-full bg-tinta px-5 py-2.5 font-bold text-white hover:bg-violeta">
            Ver planos
          </Link>
        </section>
      ) : a.usuario_id !== perfil.id ? (
        <section className="space-y-2 rounded-2xl border-2 border-tinta bg-white p-6">
          <p className="flex items-center gap-2 font-bold text-tinta">
            <Users className="size-5" /> Você faz parte de um plano Duplo
          </p>
          <p className="text-sm text-slate-600">
            Quem assinou o plano te convidou: você tem acesso a tudo da plataforma enquanto a assinatura estiver ativa
            (hoje, até {formatarData(a.ativa_ate!)}).
          </p>
        </section>
      ) : (
        <>
          <Resumo a={a} />
          {a.plano === "duplo" && <Convite a={a} agora={agora} />}
          {a.origem === "asaas" && a.ciclo === "mensal" && a.status === "ativa" && <TrocarPlano a={a} />}
          {a.ciclo === "anual" && <RenovarAnual a={a} agora={agora} />}
          {a.origem === "asaas" && a.ciclo === "mensal" && a.status === "ativa" && <Cancelar a={a} />}
        </>
      )}

      {Boolean(pagamentos?.length) && (
        <section className="space-y-3">
          <h2 className="font-extrabold tracking-tight text-tinta">Pagamentos</h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
            {pagamentos!.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-slate-700">
                  {formatarData(p.pago_em ?? p.criado_em)}
                  {p.plano && ` · ${PLANOS[p.plano as Plano]?.nome ?? p.plano}`}
                </span>
                <span className="flex items-center gap-3">
                  <strong className="text-slate-900">{formatarReais(p.valor_total_centavos)}</strong>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{p.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Resumo({ a }: { a: Assinatura }) {
  const fim = formatarData(a.periodo_ate ?? a.ativa_ate!);
  const renova = a.origem === "asaas" && a.ciclo === "mensal" && a.status === "ativa";
  return (
    <section className="grid gap-4 rounded-2xl border-2 border-tinta bg-white p-6 md:grid-cols-[1fr_auto]">
      <div className="space-y-3">
        <div>
          <p className="rotulo text-[11px] font-semibold text-violeta-700">
            {a.origem === "manual" ? "Cortesia" : a.ciclo === "anual" ? "Plano anual" : "Plano mensal"}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-tinta">{nomeDaEscolha(a)}</p>
        </div>
        <ul className="flex flex-wrap gap-2 text-xs">
          {TODOS_MODULOS.map((m) => (
            <li
              key={m}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${
                a.modulos.includes(m) ? "bg-lima text-tinta" : "bg-slate-100 text-slate-400 line-through"
              }`}
            >
              {a.modulos.includes(m) && <Check className="size-3" />}
              {MODULOS[m].nome}
            </li>
          ))}
        </ul>
        {a.plano_proximo && (
          <form action={desfazerReducao} className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <span>
              Na próxima cobrança ({fim}) você passa para{" "}
              <strong>{nomeDaEscolha({ plano: a.plano_proximo, ciclo: "mensal", modulos: a.modulos_proximos ?? [] })}</strong>.
            </span>
            <button className="font-semibold underline">Desfazer</button>
          </form>
        )}
      </div>
      <div className="space-y-1 text-sm text-slate-700 md:text-right">
        {a.origem === "asaas" && (
          <p className="text-2xl font-extrabold text-tinta">
            {formatarReais(a.valor_centavos)}
            <span className="text-sm font-semibold text-slate-500">{a.ciclo === "anual" ? "/ano" : "/mês"}</span>
          </p>
        )}
        <p className="flex items-center gap-1.5 md:justify-end">
          <CalendarClock className="size-4" /> {renova ? `Próxima cobrança em ${fim}` : `Acesso até ${fim}`}
        </p>
        {renova && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500 md:justify-end">
            <CreditCard className="size-3.5" /> No cartão cadastrado no pagamento
          </p>
        )}
        {a.status === "cancelada" && a.origem === "asaas" && (
          <p className="text-xs text-slate-500">Renovação cancelada.</p>
        )}
      </div>
    </section>
  );
}

function Convite({ a, agora }: { a: Assinatura; agora: Date }) {
  const ligado = Boolean(a.convidado_id);
  const travadoAte =
    ligado && a.convidado_trocado_em ? new Date(new Date(a.convidado_trocado_em).getTime() + 30 * 864e5) : null;
  const travado = travadoAte !== null && travadoAte > agora;
  return (
    <section className="space-y-3 rounded-2xl border-2 border-tinta bg-white p-6">
      <h2 className="flex items-center gap-2 font-extrabold tracking-tight text-tinta">
        <Users className="size-5" /> Segunda pessoa do Duplo
      </h2>
      {a.convidado_email ? (
        <p className="text-sm text-slate-700">
          <Mail className="mr-1 inline size-4" />
          <strong>{a.convidado_email}</strong>{" "}
          {ligado ? "já está usando o plano." : "ainda não entrou. Peça para ela criar a conta (ou entrar) com esse e-mail."}
        </p>
      ) : (
        <p className="text-sm text-slate-600">
          Convide alguém pelo e-mail. Ela usa tudo da plataforma com a própria conta e o próprio progresso.
        </p>
      )}
      {travado ? (
        <p className="text-xs text-slate-500">Você poderá trocar a segunda pessoa a partir de {formatarData(travadoAte!)}.</p>
      ) : (
        <form action={definirConvidado} className="flex flex-wrap gap-2">
          <input
            name="email"
            type="email"
            defaultValue={a.convidado_email ?? ""}
            placeholder="e-mail da outra pessoa"
            className="min-w-60 flex-1 rounded-full border-2 border-tinta px-4 py-2 text-sm focus:ring-2 focus:ring-lima focus:outline-none"
          />
          <button className="rounded-full bg-tinta px-4 py-2 text-sm font-bold text-white hover:bg-violeta">
            {a.convidado_email ? "Trocar" : "Convidar"}
          </button>
          {a.convidado_email && (
            <button name="email" value="" className="rounded-full px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
              Remover
            </button>
          )}
        </form>
      )}
      {ligado && !travado && <p className="text-xs text-slate-500">Depois que a pessoa entra, a troca fica liberada uma vez a cada 30 dias.</p>}
    </section>
  );
}

function TrocarPlano({ a }: { a: Assinatura }) {
  const opcoes = [
    { plano: "completo" as const, texto: `Completo · ${formatarReais(PRECO_MENSAL.completo)}/mês` },
    { plano: "duplo" as const, texto: `Duplo · ${formatarReais(PRECO_MENSAL.duplo)}/mês` },
  ].filter((o) => o.plano !== a.plano);
  return (
    <section className="space-y-4 rounded-2xl border-2 border-tinta bg-white p-6">
      <div>
        <h2 className="font-extrabold tracking-tight text-tinta">Trocar de plano</h2>
        <p className="text-sm text-slate-600">
          Subir de plano libera na hora; a diferença entra na próxima cobrança. Descer vale a partir da próxima cobrança.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <form key={o.plano} action={trocarPlano}>
            <input type="hidden" name="plano" value={o.plano} />
            <button className="rounded-full border-2 border-tinta px-4 py-2 text-sm font-bold text-tinta hover:bg-lima">
              Ir para o {o.texto}
            </button>
          </form>
        ))}
      </div>
      <form action={trocarPlano} className="space-y-3 rounded-xl bg-slate-50 p-4">
        <input type="hidden" name="plano" value="essencial" />
        <p className="text-sm font-semibold text-tinta">Ou monte o Essencial (Disciplinas + o que marcar):</p>
        <div className="flex flex-wrap gap-2">
          {AVULSOS.map((m) => (
            <label key={m} className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-300 bg-white px-3 py-1.5 text-sm">
              <input
                type="checkbox"
                name="modulos"
                value={m}
                defaultChecked={a.plano === "essencial" && a.modulos.includes(m)}
                className="accent-tinta"
              />
              {MODULOS[m].nome} <span className="text-xs text-slate-500">{formatarReais(MODULOS[m].precoCentavos)}</span>
            </label>
          ))}
        </div>
        <button className="rounded-full bg-tinta px-4 py-2 text-sm font-bold text-white hover:bg-violeta">Salvar Essencial</button>
      </form>
    </section>
  );
}

function RenovarAnual({ a, agora }: { a: Assinatura; agora: Date }) {
  const dias = Math.ceil((new Date(a.periodo_ate ?? a.ativa_ate!).getTime() - agora.getTime()) / 864e5);
  if (a.origem !== "asaas" || dias > 30) return null;
  const escolha = montarEscolha(a.plano, "anual");
  if (!escolha) return null;
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-tinta bg-amber-50 p-5 text-sm text-amber-900">
      <span>Seu plano anual termina em {dias} {dias === 1 ? "dia" : "dias"}.</span>
      <Link href={`/assinar/escolher?plano=${a.plano}&ciclo=anual`} className="rounded-full bg-tinta px-4 py-2 font-bold text-white">
        Renovar por mais 12 meses
      </Link>
    </section>
  );
}

function Cancelar({ a }: { a: Assinatura }) {
  return (
    <details className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-sm">
      <summary className="cursor-pointer font-semibold text-slate-600">Cancelar assinatura</summary>
      <form action={cancelarAssinatura} className="mt-3 space-y-3">
        <p className="text-slate-700">
          Você não será mais cobrado e continua usando até {formatarData(a.periodo_ate ?? a.ativa_ate!)}. Pode assinar de
          novo quando quiser.
        </p>
        <label className="flex items-center gap-2 text-slate-700">
          <input type="checkbox" name="confirmo" value="sim" required className="accent-tinta" /> Quero cancelar a renovação
        </label>
        <button className="rounded-full border-2 border-red-700 px-4 py-2 font-bold text-red-700 hover:bg-red-50">
          Cancelar assinatura
        </button>
      </form>
    </details>
  );
}
