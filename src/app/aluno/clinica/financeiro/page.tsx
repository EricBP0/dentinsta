import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { TIPOS_CONSULTA, diaCurto, hojeBrasilia, mesValido, nomeDoMes, partesBrasilia, somarMeses } from "@/lib/clinica/clinica";
import { resumoFinanceiro, type Lancamento } from "@/lib/clinica/dados";
import { formatarReais } from "@/lib/preco";
import { excluirLancamento } from "../actions";
import { exigirClinica } from "../acesso";
import { FormLancamento } from "../formularios";

export default async function Financeiro({ searchParams }: PageProps<"/aluno/clinica/financeiro">) {
  const { supabase } = await exigirClinica();
  const { mes: mesPedido } = await searchParams;
  const hoje = hojeBrasilia();
  const mes = mesValido(mesPedido) ? mesPedido : hoje.slice(0, 7);
  const resumo = await resumoFinanceiro(supabase, mes);
  // Lançamento novo cai em hoje se o mês for o atual; senão, no dia 1º do mês aberto.
  const dataPadrao = hoje.startsWith(mes) ? hoje : `${mes}-01`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href={`/aluno/clinica?mes=${mes}`} className="text-sm text-slate-600 hover:text-slate-900">← Dashboard</Link>
          <h2 className="text-xl font-bold capitalize text-tinta">Financeiro · {nomeDoMes(mes)}</h2>
        </div>
        <div className="flex gap-1">
          <Link href={`?mes=${somarMeses(mes, -1)}`} aria-label="Mês anterior" className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={`?mes=${somarMeses(mes, 1)}`} aria-label="Próximo mês" className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm text-emerald-900">Faturamento total</p>
          <p className="break-all text-3xl font-bold text-emerald-700">{formatarReais(resumo.faturamento)}</p>
          <p className="mt-2 text-xs text-emerald-900/80">
            Consultas: {formatarReais(resumo.deConsultas)} · Manual: {formatarReais(resumo.manual)}
          </p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-900">Custos totais</p>
          <p className="break-all text-3xl font-bold text-red-700">{formatarReais(resumo.custos)}</p>
          <p className="mt-2 text-xs text-red-900/80">Lucro: {formatarReais(resumo.lucro)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h3 className="font-semibold text-emerald-700">Faturamentos</h3>
          <FormLancamento tipo="faturamento" dataPadrao={dataPadrao} />
          <ListaLancamentos itens={resumo.lancamentos.filter((l) => l.tipo === "faturamento")} cor="text-emerald-700" vazio="Nenhum faturamento manual neste mês." />
          <h4 className="pt-2 text-sm font-semibold text-slate-700">Consultas finalizadas</h4>
          {resumo.finalizadas.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma consulta finalizada neste mês.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {resumo.finalizadas.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    {diaCurto(partesBrasilia(c.inicio).dia)} · {c.clinica_pacientes?.nome ?? TIPOS_CONSULTA[c.tipo].nome}
                  </span>
                  <span className="shrink-0 font-medium text-emerald-700">{formatarReais(Number(c.valor_centavos))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-3">
          <h3 className="font-semibold text-red-700">Custos</h3>
          <FormLancamento tipo="custo" dataPadrao={dataPadrao} />
          <ListaLancamentos itens={resumo.lancamentos.filter((l) => l.tipo === "custo")} cor="text-red-700" vazio="Nenhum custo neste mês." />
        </section>
      </div>
    </div>
  );
}

function ListaLancamentos({ itens, cor, vazio }: { itens: Lancamento[]; cor: string; vazio: string }) {
  if (itens.length === 0) return <p className="text-sm text-slate-500">{vazio}</p>;
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {itens.map((l) => (
        <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
          <span className="min-w-0 truncate">
            <span className="text-slate-500">{diaCurto(l.data)}</span> · {l.descricao}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className={`font-medium ${cor}`}>{formatarReais(l.valor_centavos)}</span>
            <form action={excluirLancamento}>
              <input type="hidden" name="id" value={l.id} />
              <button aria-label="Excluir" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600">
                <Trash2 className="size-4" />
              </button>
            </form>
          </span>
        </li>
      ))}
    </ul>
  );
}
