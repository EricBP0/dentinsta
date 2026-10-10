"use server";

import { redirect } from "next/navigation";
import { temModulo } from "@/lib/acesso";
import { exigirLogin } from "@/lib/auth";
import { carregarAcesso } from "@/lib/catalogo";
import { CARDS_NA_AMOSTRA, etiquetasDe, notaAnual, perfilDe, validarEtapa, type Respostas } from "@/lib/perfil-cliente";
import { criarClienteAdmin } from "@/lib/supabase/admin";

type Linha = { respostas: Respostas; etapa1_em: string | null; etapa2_em: string | null };

/**
 * Salva uma etapa do formulário. Perfil, etiquetas e nota são calculados aqui;
 * a gravação usa o cliente admin (o aluno não escreve em perfis_cliente). Na
 * etapa 2, quem não tem o módulo Flashcards ganha a amostra de 50 cards.
 */
export async function salvarEtapa(
  etapa: 1 | 2,
  entrada: Record<string, unknown>,
): Promise<{ ok: true; amostra: number } | { erro: string }> {
  const { supabase, perfil } = await exigirLogin();
  if (etapa !== 1 && etapa !== 2) return { erro: "Etapa inválida." };
  const acesso = await carregarAcesso(supabase, perfil);
  if (!acesso) return { erro: "O formulário é para quem já assina." };

  const [{ data: atual }, { data: disciplinas }] = await Promise.all([
    supabase
      .from("perfis_cliente")
      .select("respostas, etapa1_em, etapa2_em")
      .eq("usuario_id", perfil.id)
      .maybeSingle<Linha>(),
    supabase.from("disciplinas").select("id").overrideTypes<{ id: string }[], { merge: false }>(),
  ]);
  if (etapa === 2 && !atual?.etapa1_em) return { erro: "Responda primeiro a etapa 1." };

  const resultado = validarEtapa(
    etapa,
    entrada,
    atual?.respostas ?? {},
    (disciplinas ?? []).map((d) => d.id),
  );
  if ("erro" in resultado) return resultado;

  const respostas = { ...(atual?.respostas ?? {}), ...resultado.respostas };
  const agora = new Date().toISOString();
  const admin = criarClienteAdmin();
  const { error } = await admin.from("perfis_cliente").upsert({
    usuario_id: perfil.id,
    respostas,
    perfil: perfilDe(respostas),
    etiquetas: etiquetasDe(respostas),
    nota_anual: notaAnual(respostas),
    aceita_contato: respostas.contato === true,
    ...(etapa === 1 ? { etapa1_em: atual?.etapa1_em ?? agora } : { etapa2_em: atual?.etapa2_em ?? agora }),
    atualizado_em: agora,
  });
  if (error) {
    console.error("Falha ao salvar o formulário", { usuario: perfil.id, etapa, error });
    return { erro: "Não foi possível salvar. Tente de novo." };
  }

  let amostra = 0;
  if (etapa === 2 && !temModulo(acesso, "flashcards")) {
    const { data, error: erroAmostra } = await admin.rpc("liberar_amostra_flashcards", {
      p_usuario: perfil.id,
      p_disciplinas: Array.isArray(respostas.p8) ? respostas.p8 : [],
      p_quantidade: CARDS_NA_AMOSTRA,
    });
    if (erroAmostra) console.error("Falha ao liberar a amostra de flashcards", { usuario: perfil.id, erroAmostra });
    amostra = Number(data ?? 0);
  }
  // Sem revalidatePath: a página recarregaria no meio da tela de conclusão. O
  // painel é dinâmico e já busca as respostas novas na próxima navegação.
  return { ok: true, amostra };
}

/** "Agora não": o painel para de abrir o formulário sozinho. */
export async function pularPersonalizacao() {
  const { perfil } = await exigirLogin();
  await criarClienteAdmin()
    .from("perfis_cliente")
    .upsert({ usuario_id: perfil.id, pulado_em: new Date().toISOString() }, { onConflict: "usuario_id", ignoreDuplicates: true });
  redirect("/aluno");
}
