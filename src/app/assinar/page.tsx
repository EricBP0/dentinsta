import { Check, Users } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/marca/logo";
import { AvisoCheckout } from "@/components/ofertas";
import { exigirLogin } from "@/lib/auth";
import { carregarAcesso, formatarData } from "@/lib/catalogo";
import { textoParam } from "@/lib/listagem";
import { formatarReais } from "@/lib/preco";
import { ehModulo, MODULOS, PLANOS, PRECO_ANUAL, PRECO_MENSAL, somaAvulsos, TODOS_MODULOS } from "@/lib/planos";
import { CartaoEssencial } from "./essencial";

export default async function Planos({ searchParams }: PageProps<"/assinar">) {
  const params = await searchParams;
  const modulo = textoParam(params.modulo);
  const { supabase, perfil } = await exigirLogin();
  const acesso = await carregarAcesso(supabase, perfil);
  const ancora = somaAvulsos();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-12">
      <Link href={acesso ? "/aluno" : "/"} aria-label="OdontoLab — início" className="inline-block">
        <Logo />
      </Link>
      <header className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-tinta sm:text-4xl">Escolha seu plano</h1>
        <p className="text-slate-600">
          Assinatura mensal, sem fidelidade: cancele quando quiser. Separado, tudo sairia{" "}
          <strong>{formatarReais(ancora)}/mês</strong>. No Completo, sai por {formatarReais(PRECO_MENSAL.completo)}.
        </p>
      </header>

      <AvisoCheckout
        erro={textoParam(params.erro) || undefined}
        cancelado={params.cancelado === "1"}
        expirado={params.expirado === "1"}
      />
      {acesso && (
        <p className="rounded-2xl border-2 border-tinta bg-violeta-50 p-4 text-sm text-violeta-900">
          Você está no plano <strong>{PLANOS[acesso.plano].nome}</strong> até {formatarData(acesso.ativaAte)}.{" "}
          {acesso.titular && (
            <Link href="/aluno/assinatura" className="font-semibold underline">
              Trocar de plano
            </Link>
          )}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <CartaoEssencial inicial={ehModulo(modulo) && modulo !== "disciplinas" ? [modulo] : []} />

        {/* Completo: o destaque da página */}
        <section className="relative flex flex-col gap-4 rounded-3xl border-2 border-tinta bg-tinta p-6 text-white shadow-[6px_6px_0_0_var(--color-lima)] lg:-mt-3">
          <span className="rotulo absolute -top-3 left-6 rounded-md bg-lima px-2.5 py-1 text-[11px] font-bold text-tinta">
            Mais escolhido
          </span>
          <div>
            <p className="rotulo text-[11px] font-semibold text-lima">Completo</p>
            <p className="text-sm text-white/60 line-through">{formatarReais(ancora)}/mês</p>
            <p className="text-4xl font-extrabold tracking-tight">
              {formatarReais(PRECO_MENSAL.completo)}
              <span className="text-base font-semibold text-white/70">/mês</span>
            </p>
            <p className="text-sm text-white/80">Tudo da plataforma por quase metade do preço.</p>
          </div>
          <ListaModulos claro />
          <BotoesCiclo plano="completo" claro />
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border-2 border-tinta bg-white p-6">
          <div>
            <p className="rotulo flex items-center gap-1 text-[11px] font-semibold text-violeta-700">
              <Users className="size-3.5" /> Duplo
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-tinta">
              {formatarReais(PRECO_MENSAL.duplo)}
              <span className="text-base font-semibold text-slate-500">/mês</span>
            </p>
            <p className="text-sm text-slate-600">
              O Completo para você e mais uma pessoa: {formatarReais(PRECO_MENSAL.duplo / 2)} para cada.
            </p>
          </div>
          <ListaModulos />
          <p className="rounded-xl bg-violeta-50 p-3 text-xs text-violeta-900">
            Depois de assinar, convide a outra pessoa pelo e-mail. Cada um tem sua conta e seu progresso.
          </p>
          <BotoesCiclo plano="duplo" />
        </section>
      </div>

      <section className="grid gap-4 text-sm text-slate-700 sm:grid-cols-3">
        <div className="rounded-2xl border-2 border-tinta bg-white p-4">
          <p className="font-bold text-tinta">Como é a cobrança?</p>
          <p>Mensal: no cartão de crédito, todo mês. Anual: Pix ou cartão à vista, ou em até 12x no cartão.</p>
        </div>
        <div className="rounded-2xl border-2 border-tinta bg-white p-4">
          <p className="font-bold text-tinta">Posso cancelar?</p>
          <p>Quando quiser, pela sua área. Você continua usando até o fim do período já pago.</p>
        </div>
        <div className="rounded-2xl border-2 border-tinta bg-white p-4">
          <p className="font-bold text-tinta">Posso mudar de plano?</p>
          <p>Sim. Subir de plano libera na hora; a diferença entra na próxima cobrança.</p>
        </div>
      </section>

      <p className="text-center text-xs text-slate-500">
        Pagamento processado com segurança pelo Asaas. Você é levado à página de pagamento e volta para cá ao concluir.
      </p>
    </main>
  );
}

function ListaModulos({ claro = false }: { claro?: boolean }) {
  return (
    <ul className="space-y-2 text-sm">
      {TODOS_MODULOS.map((m) => (
        <li key={m} className="flex items-start gap-2">
          <Check className={`mt-0.5 size-4 shrink-0 ${claro ? "text-lima" : "text-violeta-700"}`} />
          <span className="flex-1">
            <strong>{MODULOS[m].nome}</strong>
            <span className={`block text-xs ${claro ? "text-white/70" : "text-slate-600"}`}>{MODULOS[m].descricao}</span>
          </span>
          <span className={`text-xs line-through ${claro ? "text-white/50" : "text-slate-400"}`}>
            {formatarReais(MODULOS[m].precoCentavos)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BotoesCiclo({ plano, claro = false }: { plano: "completo" | "duplo"; claro?: boolean }) {
  const economia = PRECO_MENSAL[plano] * 12 - PRECO_ANUAL[plano];
  return (
    <div className="mt-auto space-y-2">
      <Link
        href={`/assinar/escolher?plano=${plano}&ciclo=mensal`}
        className={`block rounded-full py-3 text-center font-bold transition hover:-translate-y-0.5 ${
          claro ? "bg-lima text-tinta" : "bg-tinta text-white hover:bg-violeta"
        }`}
      >
        Assinar mensal
      </Link>
      <Link
        href={`/assinar/escolher?plano=${plano}&ciclo=anual`}
        className={`block rounded-full border-2 py-2.5 text-center text-sm font-bold transition ${
          claro ? "border-lima text-lima hover:bg-lima hover:text-tinta" : "border-tinta text-tinta hover:bg-lima"
        }`}
      >
        Anual: {formatarReais(PRECO_ANUAL[plano])} (economize {formatarReais(economia)})
      </Link>
    </div>
  );
}
