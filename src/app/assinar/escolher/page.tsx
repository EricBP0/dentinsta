import { ArrowLeft, Check, CreditCard, QrCode, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/marca/logo";
import { exigirLogin } from "@/lib/auth";
import { textoParam } from "@/lib/listagem";
import { PARCELAS_ANUAL } from "@/lib/pagamento/ofertas";
import { formatarReais } from "@/lib/preco";
import { MODULOS, montarEscolha, nomeDaEscolha, PRECO_ANUAL, PRECO_MENSAL, upsellParaCompleto, type Escolha } from "@/lib/planos";
import { iniciarAssinatura } from "../actions";

/** Revisão da escolha antes do pagamento. No Essencial, oferece o Completo. */
export default async function Escolher({ searchParams }: PageProps<"/assinar/escolher">) {
  const params = await searchParams;
  await exigirLogin();
  const modulos = ([] as string[]).concat(params.modulos ?? []).flatMap((m) => m.split(","));
  const escolha = montarEscolha(textoParam(params.plano), textoParam(params.ciclo), modulos);
  if (!escolha) redirect("/assinar");
  const upsell = upsellParaCompleto(escolha);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-12">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="OdontoLab — início">
          <Logo />
        </Link>
        <Link href="/assinar" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-tinta">
          <ArrowLeft className="size-4" /> Planos
        </Link>
      </div>

      {upsell ? <Upsell escolha={escolha} {...upsell} /> : <Resumo escolha={escolha} />}

      <p className="text-center text-xs text-slate-500">
        Pagamento processado com segurança pelo Asaas. Cancele quando quiser pela sua área.
      </p>
    </main>
  );
}

function CamposEscolha({ escolha }: { escolha: Pick<Escolha, "plano" | "ciclo" | "modulos"> }) {
  return (
    <>
      <input type="hidden" name="plano" value={escolha.plano} />
      <input type="hidden" name="ciclo" value={escolha.ciclo} />
      {escolha.modulos.map((m) => (
        <input key={m} type="hidden" name="modulos" value={m} />
      ))}
    </>
  );
}

function Upsell({
  escolha,
  diferencaCentavos,
  modulosGanhos,
}: {
  escolha: Escolha;
  diferencaCentavos: number;
  modulosGanhos: (keyof typeof MODULOS)[];
}) {
  const completo = montarEscolha("completo", "mensal")!;
  const chamada =
    diferencaCentavos > 0
      ? `Por só mais ${formatarReais(diferencaCentavos)} por mês, leve tudo`
      : diferencaCentavos === 0
        ? "Pelo mesmo preço, leve tudo"
        : `Leve tudo e pague ${formatarReais(-diferencaCentavos)} a menos por mês`;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="rotulo text-[11px] font-semibold text-violeta-700">Antes de continuar</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-tinta">{chamada}</h1>
        <p className="text-slate-600">
          No Completo você ganha {modulosGanhos.map((m) => MODULOS[m].nome).join(", ")} além do que escolheu.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <form action={iniciarAssinatura} className="flex flex-col gap-4 rounded-3xl border-2 border-tinta bg-tinta p-6 text-white shadow-[6px_6px_0_0_var(--color-lima)]">
          <CamposEscolha escolha={completo} />
          <div>
            <p className="rotulo flex items-center gap-1 text-[11px] font-semibold text-lima">
              <Sparkles className="size-3.5" /> Completo
            </p>
            <p className="text-4xl font-extrabold tracking-tight">
              {formatarReais(completo.valorCentavos)}
              <span className="text-base font-semibold text-white/70">/mês</span>
            </p>
          </div>
          <ul className="space-y-1.5 text-sm">
            {completo.modulos.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <Check className="size-4 text-lima" />
                {MODULOS[m].nome}
                {modulosGanhos.includes(m) && (
                  <span className="rounded-full bg-lima px-1.5 text-[10px] font-bold text-tinta">a mais</span>
                )}
              </li>
            ))}
          </ul>
          <button className="mt-auto rounded-full bg-lima py-3 font-bold text-tinta transition hover:-translate-y-0.5">
            Quero o Completo
          </button>
        </form>

        <form action={iniciarAssinatura} className="flex flex-col gap-4 rounded-3xl border-2 border-tinta bg-white p-6">
          <CamposEscolha escolha={escolha} />
          <div>
            <p className="rotulo text-[11px] font-semibold text-slate-600">Sua escolha</p>
            <p className="text-4xl font-extrabold tracking-tight text-tinta">
              {formatarReais(escolha.valorCentavos)}
              <span className="text-base font-semibold text-slate-500">/mês</span>
            </p>
          </div>
          <ul className="space-y-1.5 text-sm text-slate-700">
            {escolha.modulos.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <Check className="size-4 text-violeta-700" />
                {MODULOS[m].nome}
              </li>
            ))}
          </ul>
          <button className="mt-auto rounded-full border-2 border-tinta py-3 text-sm font-bold text-tinta transition hover:bg-lima">
            Continuar com {nomeDaEscolha(escolha)}
          </button>
        </form>
      </div>
      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <CreditCard className="size-3.5" /> Cobrança mensal no cartão de crédito
      </p>
    </div>
  );
}

function Resumo({ escolha }: { escolha: Escolha }) {
  const plano = escolha.plano as "completo" | "duplo";
  const economia = PRECO_MENSAL[plano] * 12 - PRECO_ANUAL[plano];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="rotulo text-[11px] font-semibold text-violeta-700">Confirme seu plano</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-tinta">{nomeDaEscolha(escolha)}</h1>
        <p className="text-slate-600">
          {plano === "duplo" ? "Tudo da plataforma para você e mais uma pessoa." : "Tudo da plataforma."}{" "}
          {escolha.ciclo === "anual" ? "12 meses de acesso." : "Renova todo mês; cancele quando quiser."}
        </p>
      </header>

      {escolha.ciclo === "mensal" ? (
        <form action={iniciarAssinatura} className="space-y-4 rounded-3xl border-2 border-tinta bg-white p-6">
          <CamposEscolha escolha={escolha} />
          <p className="text-4xl font-extrabold tracking-tight text-tinta">
            {formatarReais(escolha.valorCentavos)}
            <span className="text-base font-semibold text-slate-500">/mês</span>
          </p>
          <p className="flex items-center gap-1.5 text-sm text-slate-600">
            <CreditCard className="size-4" /> No cartão de crédito, todo mês.
          </p>
          <button className="w-full rounded-full bg-tinta py-3 font-bold text-white transition hover:bg-violeta">
            Ir para o pagamento
          </button>
          <p className="text-center text-sm">
            <Link href={`/assinar/escolher?plano=${plano}&ciclo=anual`} className="font-semibold text-violeta-700 underline">
              Prefere o anual? {formatarReais(PRECO_ANUAL[plano])} e economize {formatarReais(economia)}
            </Link>{" "}
            <span className="text-slate-500">(aceita Pix)</span>
          </p>
        </form>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <form action={iniciarAssinatura} className="flex flex-col gap-3 rounded-3xl border-2 border-tinta bg-white p-6">
            <CamposEscolha escolha={escolha} />
            <input type="hidden" name="modalidade" value="a_vista" />
            <p className="flex items-center gap-1.5 font-semibold text-tinta">
              <QrCode className="size-4" /> À vista
            </p>
            <p className="text-3xl font-extrabold text-tinta">{formatarReais(escolha.valorCentavos)}</p>
            <p className="text-sm text-slate-600">Pix ou cartão em 1x. O Pix libera na hora.</p>
            <button className="mt-auto rounded-full bg-tinta py-3 font-bold text-white transition hover:bg-violeta">
              Pagar à vista
            </button>
          </form>
          <form action={iniciarAssinatura} className="flex flex-col gap-3 rounded-3xl border-2 border-tinta bg-white p-6">
            <CamposEscolha escolha={escolha} />
            <input type="hidden" name="modalidade" value="parcelado" />
            <p className="flex items-center gap-1.5 font-semibold text-tinta">
              <CreditCard className="size-4" /> Parcelado
            </p>
            <p className="text-3xl font-extrabold text-tinta">
              até {PARCELAS_ANUAL}x {formatarReais(Math.ceil(escolha.valorCentavos / PARCELAS_ANUAL))}
            </p>
            <p className="text-sm text-slate-600">No cartão de crédito (total {formatarReais(escolha.valorCentavos)}).</p>
            <button className="mt-auto rounded-full border-2 border-tinta py-3 font-bold text-tinta transition hover:bg-lima">
              Pagar parcelado
            </button>
          </form>
        </div>
      )}
      <p className="text-center text-sm text-slate-600">
        Economia de {formatarReais(economia)} no anual em relação a 12 mensalidades.{" "}
        {escolha.ciclo === "anual" && (
          <Link href={`/assinar/escolher?plano=${plano}&ciclo=mensal`} className="underline">
            Prefiro o mensal
          </Link>
        )}
      </p>
    </div>
  );
}
