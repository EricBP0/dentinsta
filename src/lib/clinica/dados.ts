import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { intervaloUtc, limitesDoMes, type StatusConsulta, type TipoConsulta } from "./clinica";

export type Consulta = {
  id: string;
  tipo: TipoConsulta;
  inicio: string;
  duracao_min: number;
  status: StatusConsulta;
  valor_centavos: number;
  observacoes: string;
  clinica_pacientes: { id: string; nome: string } | null;
};
export const COLUNAS_CONSULTA = "id, tipo, inicio, duracao_min, status, valor_centavos, observacoes, clinica_pacientes(id, nome)";

export type Lancamento = { id: string; tipo: "faturamento" | "custo"; descricao: string; valor_centavos: number; data: string };

/** Faturamento (consultas finalizadas + lançamentos), custos e lucro do mês (AAAA-MM). */
export async function resumoFinanceiro(supabase: SupabaseClient, mes: string) {
  const { inicio, fim } = limitesDoMes(mes);
  const { de, ate } = intervaloUtc(inicio, fim);
  const [{ data: consultas }, { data: lancamentos }] = await Promise.all([
    supabase
      .from("clinica_consultas")
      .select(COLUNAS_CONSULTA)
      .gte("inicio", de)
      .lt("inicio", ate)
      .order("inicio")
      .overrideTypes<Consulta[], { merge: false }>(),
    supabase
      .from("clinica_lancamentos")
      .select("id, tipo, descricao, valor_centavos, data")
      .gte("data", inicio)
      .lte("data", fim)
      .order("data")
      .order("criado_em")
      .overrideTypes<Lancamento[], { merge: false }>(),
  ]);

  const todas = consultas ?? [];
  const finalizadas = todas.filter((c) => c.status === "finalizada");
  const lista = (lancamentos ?? []).map((l) => ({ ...l, valor_centavos: Number(l.valor_centavos) }));
  const soma = (valores: number[]) => valores.reduce((s, v) => s + v, 0);

  const deConsultas = soma(finalizadas.map((c) => Number(c.valor_centavos)));
  const manual = soma(lista.filter((l) => l.tipo === "faturamento").map((l) => l.valor_centavos));
  const custos = soma(lista.filter((l) => l.tipo === "custo").map((l) => l.valor_centavos));
  const faturamento = deConsultas + manual;

  return {
    faturamento,
    deConsultas,
    manual,
    custos,
    lucro: faturamento - custos,
    percentualCustos: faturamento > 0 ? Math.min(100, Math.round((custos / faturamento) * 100)) : custos > 0 ? 100 : 0,
    lancamentos: lista,
    finalizadas,
    consultasDoMes: todas.filter((c) => c.status !== "cancelada").length,
    faltasDoMes: todas.filter((c) => c.status === "faltou").length,
  };
}
