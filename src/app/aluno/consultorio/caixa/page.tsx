import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { TIPOS_CONSULTA, diaCurto, hojeBrasilia, mesValido, nomeDoMes, partesBrasilia, somarMeses } from "@/lib/consultorio/consultorio";
import { resumoFinanceiro } from "@/lib/consultorio/dados";
import { formatarReais } from "@/lib/preco";
import { exigirConsultorio } from "../acesso";
import { excluirLancamento } from "../actions";
import { FormLancamento } from "../formularios";
import { Painel, Rotulo } from "../ui";

type LinhaExtrato = {
  chave: string;
  dia: string;
  descricao: string;
  detalhe: string;
  centavos: number; // positivo = entrada, negativo = saída
  lancamentoId?: string;
};

export default async function Caixa({ searchParams }: PageProps<"/aluno/consultorio/caixa">) {
  const { supabase } = await exigirConsultorio();
  const { mes: mesPedido } = await searchParams;
  const hoje = hojeBrasilia();
  const mes = mesValido(mesPedido) ? mesPedido : hoje.slice(0, 7);
  const caixa = await resumoFinanceiro(supabase, mes);
  // Lançamento novo cai em hoje se o mês for o atual; senão, no dia 1º do mês aberto.
  const dataPadrao = hoje.startsWith(mes) ? hoje : `${mes}-01`;

  const extrato: LinhaExtrato[] = [
    ...caixa.finalizadas.map((c) => ({
      chave: `c${c.id}`,
      dia: partesBrasilia(c.inicio).dia,
      descricao: c.clinica_pacientes?.nome ?? TIPOS_CONSULTA[c.tipo].nome,
      detalhe: `Atendimento · ${TIPOS_CONSULTA[c.tipo].nome}`,
      centavos: Number(c.valor_centavos),
    })),
    ...caixa.lancamentos.map((l) => ({
      chave: `l${l.id}`,
      dia: l.data,
      descricao: l.descricao,
      detalhe: l.tipo === "faturamento" ? "Entrada lançada" : "Saída lançada",
      centavos: l.tipo === "faturamento" ? l.valor_centavos : -l.valor_centavos,
      lancamentoId: l.id,
    })),
  ]
    .filter((l) => l.centavos !== 0)
    .sort((a, b) => b.dia.localeCompare(a.dia));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Rotulo className="text-violeta">Caixa</Rotulo>
          <h2 className="text-2xl font-extrabold capitalize tracking-tight text-tinta">{nomeDoMes(mes)}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`?mes=${somarMeses(mes, -1)}`} aria-label="Mês anterior" className="grid size-9 place-items-center rounded-full border-2 border-tinta bg-white hover:bg-lima">
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={`?mes=${somarMeses(mes, 1)}`} aria-label="Próximo mês" className="grid size-9 place-items-center rounded-full border-2 border-tinta bg-white hover:bg-lima">
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-2xl border-2 border-tinta sm:grid-cols-3">
        <div className="bg-white p-4">
          <Rotulo className="text-slate-500">Entradas</Rotulo>
          <p className="break-all text-2xl font-extrabold text-tinta">{formatarReais(caixa.faturamento)}</p>
          <p className="text-xs text-slate-500">
            Atendimentos {formatarReais(caixa.deConsultas)} · Lançadas {formatarReais(caixa.manual)}
          </p>
        </div>
        <div className="border-t-2 border-tinta bg-white p-4 sm:border-l-2 sm:border-t-0">
          <Rotulo className="text-slate-500">Saídas</Rotulo>
          <p className="break-all text-2xl font-extrabold text-red-700">{formatarReais(caixa.custos)}</p>
          <p className="text-xs text-slate-500">{caixa.percentualCustos}% das entradas</p>
        </div>
        <div className="border-t-2 border-tinta bg-lima p-4 sm:border-l-2 sm:border-t-0">
          <Rotulo className="text-tinta/70">Saldo</Rotulo>
          <p className={`break-all text-2xl font-extrabold ${caixa.lucro >= 0 ? "text-tinta" : "text-red-700"}`}>{formatarReais(caixa.lucro)}</p>
          <p className="text-xs text-tinta/70">Entradas menos saídas</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Painel rotulo="Extrato" titulo="Movimentações do mês">
          {extrato.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Nada no caixa deste mês. Atendimentos marcados como “Atendido” e os lançamentos aparecem aqui.
            </p>
          ) : (
            <ul className="divide-y-2 divide-dashed divide-slate-100">
              {extrato.map((l) => (
                <li key={l.chave} className="flex items-center gap-3 py-2.5">
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full border-2 border-tinta ${l.centavos > 0 ? "bg-lima" : "bg-red-200"}`}
                  >
                    {l.centavos > 0 ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{l.descricao}</p>
                    <p className="text-xs text-slate-500">
                      {diaCurto(l.dia)} · {l.detalhe}
                    </p>
                  </div>
                  <span className={`shrink-0 font-bold ${l.centavos > 0 ? "text-tinta" : "text-red-700"}`}>
                    {l.centavos > 0 ? "+" : "−"} {formatarReais(Math.abs(l.centavos))}
                  </span>
                  {l.lancamentoId ? (
                    <form action={excluirLancamento}>
                      <input type="hidden" name="id" value={l.lancamentoId} />
                      <button aria-label="Excluir lançamento" className="rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <X className="size-4" />
                      </button>
                    </form>
                  ) : (
                    <span className="w-6" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Painel>

        <div className="space-y-4">
          <Painel rotulo="+ Entrada" titulo="Lançar entrada" className="bg-papel">
            <FormLancamento tipo="faturamento" dataPadrao={dataPadrao} />
          </Painel>
          <Painel rotulo="− Saída" titulo="Lançar saída" className="bg-papel">
            <FormLancamento tipo="custo" dataPadrao={dataPadrao} />
          </Painel>
        </div>
      </div>
    </div>
  );
}
