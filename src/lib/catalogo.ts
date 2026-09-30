import type { SupabaseClient } from "@supabase/supabase-js";
import { paraData, situacaoItem, type Acesso, type SituacaoItem } from "@/lib/acesso";
import { progressoObrigatorio, type ProgressoObrigatorio } from "@/lib/certificado/regra";
import {
  COLUNAS_ITEM,
  type AcessoRow,
  type Disciplina,
  type Item,
  type Modulo,
  type Perfil,
} from "@/lib/tipos";

export type ItemCatalogo = Item & { situacao: SituacaoItem; concluido: boolean };
export type ModuloCatalogo = Modulo & { itens: ItemCatalogo[] };
export type DisciplinaCatalogo = Disciplina & {
  modulos: ModuloCatalogo[];
  progresso: ProgressoObrigatorio;
  /** "liberada": tem algo para abrir. "renove": tudo bloqueado pela janela. */
  situacao: "em_breve" | "liberada" | "renove" | "sem_acesso";
};

export async function carregarAcesso(supabase: SupabaseClient, perfil: Perfil): Promise<Acesso | null> {
  const { data } = await supabase
    .from("acessos")
    .select("usuario_id, compra_em, novidades_ate, ia_ate")
    .eq("usuario_id", perfil.id)
    .maybeSingle<AcessoRow>();
  if (!data) return null;
  return { novidadesAte: new Date(data.novidades_ate), iaAte: new Date(data.ia_ate) };
}

/**
 * Monta o catálogo do aluno. O RLS já filtra o que está publicado; aqui só
 * calculamos o cadeado ("renove") e o progresso. Filtre por slug para uma disciplina.
 */
export async function carregarCatalogo(
  supabase: SupabaseClient,
  perfil: Perfil,
  filtro?: { slug: string },
): Promise<{ acesso: Acesso | null; disciplinas: DisciplinaCatalogo[] }> {
  const equipe = perfil.papel !== "aluno";

  // Disciplinas, módulos e itens numa consulta só (o PostgREST junta pelas
  // chaves estrangeiras e o RLS vale para cada tabela). Tudo em paralelo: cada
  // ida ao banco a menos é tempo a menos para a página abrir.
  let consultaDisciplinas = supabase
    .from("disciplinas")
    .select(`*, modulos(*, itens(${COLUNAS_ITEM}))`)
    .in("status", ["em_breve", "publicada"])
    .eq("modulos.status", "publicado")
    .eq("modulos.itens.status", "publicado")
    .order("ordem")
    .order("nome")
    .order("ordem", { referencedTable: "modulos" })
    .order("ordem", { referencedTable: "modulos.itens" });
  if (filtro) consultaDisciplinas = consultaDisciplinas.eq("slug", filtro.slug);

  const [acesso, { data: disciplinas }, { data: progresso }] = await Promise.all([
    carregarAcesso(supabase, perfil),
    consultaDisciplinas.overrideTypes<(Disciplina & { modulos: (Modulo & { itens: Item[] })[] })[], { merge: false }>(),
    supabase
      .from("progresso_item")
      .select("item_id")
      .eq("usuario_id", perfil.id)
      .eq("concluido", true)
      .overrideTypes<{ item_id: string }[], { merge: false }>(),
  ]);
  if (!disciplinas?.length) return { acesso, disciplinas: [] };
  const concluidos = new Set((progresso ?? []).map((p) => p.item_id));

  const resultado = disciplinas.map(({ modulos, ...disciplina }): DisciplinaCatalogo => {
    const modulosDaDisciplina = (modulos ?? []).map((modulo) => ({
      ...modulo,
      itens: (modulo.itens ?? []).map((item) => ({
        ...item,
        concluido: concluidos.has(item.id),
        situacao: situacaoItem({
          acesso,
          equipe,
          datas: {
            item: paraData(item.primeira_publicacao_em),
            modulo: paraData(modulo.primeira_publicacao_em),
            disciplina: paraData(disciplina.primeira_publicacao_em),
          },
        }),
      })),
    }));

    const todosItens = modulosDaDisciplina.flatMap((m) => m.itens);
    const progressoDisciplina = progressoObrigatorio(
      todosItens.map((i) => ({
        id: i.id,
        obrigatorio: i.obrigatorio,
        liberado: i.situacao === "liberado",
      })),
      concluidos,
    );

    let situacao: DisciplinaCatalogo["situacao"];
    if (disciplina.status === "em_breve") situacao = "em_breve";
    else if (!acesso && !equipe) situacao = "sem_acesso";
    else if (todosItens.length > 0 && todosItens.every((i) => i.situacao === "renove")) situacao = "renove";
    else situacao = "liberada";

    return {
      ...disciplina,
      modulos: modulosDaDisciplina,
      progresso: progressoDisciplina,
      situacao,
    };
  });

  return { acesso, disciplinas: resultado };
}

export function formatarData(data: Date | string) {
  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}
