import type { SupabaseClient } from "@supabase/supabase-js";
import { termoIlike, textoParam } from "@/lib/listagem";
import { PERFIS, PERGUNTAS, type Respostas } from "@/lib/perfil-cliente";

// Filtros da lista de perfis, usados pela página e pela exportação em CSV.

export type LinhaPerfil = {
  usuario_id: string;
  perfil: keyof typeof PERFIS | null;
  etiquetas: string[];
  nota_anual: number;
  aceita_contato: boolean;
  respostas: Respostas;
  etapa1_em: string | null;
  etapa2_em: string | null;
  atualizado_em: string;
  perfis: { nome: string; email: string };
};

export const ORIGENS = PERGUNTAS.find((p) => p.id === "p4")!.opcoes!;

export function lerFiltros(params: Record<string, string | string[] | undefined>) {
  const perfil = textoParam(params.perfil);
  const origem = textoParam(params.origem);
  return {
    q: textoParam(params.q),
    perfil: perfil in PERFIS ? perfil : "",
    origem: ORIGENS.some(([v]) => v === origem) ? origem : "",
    nota: textoParam(params.nota) === "6" ? "6" : "",
    contato: textoParam(params.contato) === "1" ? "1" : "",
  };
}
export type FiltrosPerfis = ReturnType<typeof lerFiltros>;

export function consultarPerfis(supabase: SupabaseClient, f: FiltrosPerfis, faixa?: [number, number]) {
  const termo = termoIlike(f.q);
  let consulta = supabase
    .from("perfis_cliente")
    .select(
      `usuario_id, perfil, etiquetas, nota_anual, aceita_contato, respostas, etapa1_em, etapa2_em, atualizado_em, perfis!inner(nome, email)`,
      { count: "exact" },
    )
    .not("etapa1_em", "is", null)
    .order("atualizado_em", { ascending: false });
  if (faixa) consulta = consulta.range(...faixa);
  if (f.perfil) consulta = consulta.eq("perfil", f.perfil);
  if (f.origem) consulta = consulta.contains("etiquetas", [`origem:${f.origem}`]);
  if (f.nota) consulta = consulta.gte("nota_anual", 6);
  if (f.contato) consulta = consulta.eq("aceita_contato", true);
  if (termo) consulta = consulta.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%`, { referencedTable: "perfis" });
  return consulta.overrideTypes<LinhaPerfil[], { merge: false }>();
}
