import { Lock } from "lucide-react";
import Link from "next/link";
import { BarraAnimada } from "@/components/movimento";
import type { Acesso } from "@/lib/acesso";
import { formatarData } from "@/lib/catalogo";
import { formatarReais } from "@/lib/preco";
import { MODULOS, PARCELA_ANUAL, PLANOS, PRECO_MENSAL, somaAvulsos, type Modulo } from "@/lib/planos";

/** Link para os planos, já com o módulo que falta marcado. */
export function hrefDoPlano(modulo?: Modulo) {
  return modulo ? `/assinar?modulo=${modulo}` : "/assinar";
}

/** Cadeado de item ou área fora do plano: leva para a página de planos. */
export function BotaoPlano({ texto = "Liberar no seu plano", modulo }: { texto?: string; modulo?: Modulo }) {
  return (
    <Link
      href={hrefDoPlano(modulo)}
      className="inline-flex items-center gap-1 rounded-full border-2 border-tinta bg-amber-200 px-3 py-1 text-xs font-bold text-tinta hover:bg-lima"
    >
      🔒 {texto}
    </Link>
  );
}

/**
 * Página inteira para quem abre uma área que o plano não inclui: diz o que é,
 * quanto custa sozinha e mostra o Completo como a opção que vale mais.
 */
export function AreaBloqueada({ modulo, temAssinatura }: { modulo: Modulo; temAssinatura: boolean }) {
  const info = MODULOS[modulo];
  return (
    <div className="mx-auto max-w-xl space-y-5 rounded-2xl border-2 border-tinta bg-white p-8 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-xl bg-violeta-50 text-violeta-700">
        <Lock className="size-6" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-extrabold text-tinta">{info.nome}</h1>
        <p className="text-slate-600">{info.descricao}.</p>
      </div>
      <p className="text-sm text-slate-600">
        {temAssinatura ? "Seu plano ainda não inclui esta área. " : ""}
        Some ao Essencial mensal por <strong>{formatarReais(info.precoCentavos)}/mês</strong>, ou leve{" "}
        <strong>tudo</strong> no Completo por 12x {formatarReais(PARCELA_ANUAL.completo)} no anual ou{" "}
        {formatarReais(PRECO_MENSAL.completo)}/mês <span className="text-slate-500">(separado sairia {formatarReais(somaAvulsos())}/mês)</span>.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href={`/assinar/escolher?plano=completo&ciclo=anual`}
          className="rounded-full border-2 border-tinta bg-lima px-4 py-2 text-sm font-bold text-tinta transition hover:-translate-y-0.5"
        >
          Quero o Completo
        </Link>
        <Link href={hrefDoPlano(modulo)} className="rounded-full border-2 border-tinta px-4 py-2 text-sm font-bold text-tinta hover:bg-lima">
          Ver planos
        </Link>
      </div>
    </div>
  );
}

export function BarraProgresso({ feitos, total }: { feitos: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((feitos / total) * 100);
  return (
    <div>
      <BarraAnimada porcentagem={pct} />
      <p className="mt-1 text-xs text-slate-600">
        {feitos} de {total} itens obrigatórios
      </p>
    </div>
  );
}

/** Selo do plano do aluno ("Plano Completo · renova em 10/11/2026"). */
export function SeloPlano({ acesso }: { acesso: Acesso }) {
  const data = formatarData(acesso.periodoAte ?? acesso.ativaAte);
  return (
    <Link
      href="/aluno/assinatura"
      className="inline-flex items-center gap-1 rounded-full border-2 border-tinta bg-lima px-3 py-1 text-xs font-semibold text-tinta hover:-translate-y-0.5"
    >
      Plano {PLANOS[acesso.plano].nome}
      <span className="font-normal">
        · {acesso.status === "ativa" && acesso.origem === "asaas" ? `renova em ${data}` : `válido até ${data}`}
      </span>
    </Link>
  );
}
