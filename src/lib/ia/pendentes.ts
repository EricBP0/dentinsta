import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { cotaMensal, inicioDoMes } from "./cota";
import { corrigirDiscursiva } from "./corrigir";
import type { CriterioRubrica } from "./rubrica";

type RespostaPendente = {
  id: string;
  usuario_id: string;
  resposta: string;
  questoes: { enunciado: string; gabarito: string; rubrica: CriterioRubrica[] };
};

/** Quantas correções por IA o aluno já usou no mês (horário de Brasília). */
export async function usoNoMes(usuarioId: string): Promise<number> {
  const admin = criarClienteAdmin();
  const { count } = await admin
    .from("uso_ia")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .eq("tipo", "correcao")
    .gte("criado_em", inicioDoMes().toISOString());
  return count ?? 0;
}

/**
 * Corrige com IA as discursivas pendentes (ou que deram erro) de um simulado.
 * Roda no servidor com a chave secreta: o aluno não consegue gravar a própria nota.
 */
export async function corrigirPendentes(simuladoId: string) {
  const admin = criarClienteAdmin();

  const { data: respostas } = await admin
    .from("respostas")
    .select("id, usuario_id, resposta, questoes(enunciado, gabarito, rubrica)")
    .eq("simulado_id", simuladoId)
    .in("status_correcao", ["pendente", "erro"])
    .overrideTypes<RespostaPendente[], { merge: false }>();
  if (!respostas?.length) return;

  const usuarioId = respostas[0].usuario_id;
  const { data: acesso } = await admin
    .from("acessos")
    .select("ia_ate")
    .eq("usuario_id", usuarioId)
    .maybeSingle<{ ia_ate: string }>();
  const iaAtiva = acesso !== null && new Date(acesso.ia_ate) >= new Date();

  let usadas = await usoNoMes(usuarioId);
  const limite = cotaMensal();

  // Uma por vez: simulados têm poucas discursivas e isso respeita a cota com precisão.
  for (const resposta of respostas) {
    if (!iaAtiva || usadas >= limite) {
      await admin.from("respostas").update({ status_correcao: "sem_cota" }).eq("id", resposta.id);
      continue;
    }

    try {
      const resultado = await corrigirDiscursiva(resposta.questoes, resposta.resposta);
      usadas += 1;
      await admin.from("uso_ia").insert({
        usuario_id: usuarioId,
        tipo: "correcao",
        modelo: resultado.modelo,
        tokens_entrada: resultado.uso.entrada,
        tokens_saida: resultado.uso.saida,
        tokens_cache: resultado.uso.cache,
        resposta_id: resposta.id,
      });
      await admin
        .from("respostas")
        .update({
          nota: resultado.nota,
          feedback: resultado.feedback,
          corrigido_por: "ia",
          status_correcao: "corrigida",
          corrigido_em: new Date().toISOString(),
        })
        .eq("id", resposta.id);
    } catch (erro) {
      console.error("Falha na correção por IA", { respostaId: resposta.id, erro });
      await admin.from("respostas").update({ status_correcao: "erro" }).eq("id", resposta.id);
    }
  }

  await admin.rpc("atualizar_nota_simulado", { p_simulado_id: simuladoId });
}
