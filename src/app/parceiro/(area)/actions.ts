"use server";

import { revalidatePath } from "next/cache";
import { exigirAfiliado } from "@/lib/afiliado-conta";
import { SAQUE_MINIMO_CENTAVOS, validarChavePix } from "@/lib/afiliados";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export type EstadoParceiro = { erro?: string; mensagem?: string };

export async function salvarChavePix(_: EstadoParceiro, formData: FormData): Promise<EstadoParceiro> {
  const { afiliado } = await exigirAfiliado();
  if (!afiliado) return { erro: "Cadastro de parceiro não encontrado." };
  const chave = validarChavePix(String(formData.get("tipo") ?? ""), String(formData.get("chave") ?? ""));
  if (!chave) return { erro: "Chave Pix inválida para o tipo escolhido." };
  if (chave.chave === afiliado.chave_pix && chave.tipo === afiliado.tipo_chave_pix) return { mensagem: "Chave Pix mantida." };

  const { error } = await criarClienteAdmin()
    .from("afiliados")
    .update({
      chave_pix: chave.chave,
      tipo_chave_pix: chave.tipo,
      // A conferência do saque avisa se a chave mudou há pouco (proteção contra conta invadida).
      chave_pix_alterada_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", afiliado.id);
  if (error) return { erro: "Não foi possível salvar a chave Pix." };
  revalidatePath("/parceiro");
  return { mensagem: "Chave Pix salva." };
}

const ERROS_SAQUE: Record<string, string> = {
  sem_chave_pix: "Cadastre sua chave Pix antes de pedir o saque.",
  saque_em_aberto: "Você já tem um saque em análise.",
  abaixo_do_minimo: "O saldo disponível ainda não chegou ao mínimo para saque.",
  afiliado_inativo: "Seu cadastro de parceiro está pausado.",
};

export async function solicitarSaque(): Promise<EstadoParceiro> {
  const { afiliado } = await exigirAfiliado();
  if (!afiliado) return { erro: "Cadastro de parceiro não encontrado." };
  const { error } = await criarClienteAdmin().rpc("solicitar_saque", {
    p_afiliado_id: afiliado.id,
    p_minimo_centavos: SAQUE_MINIMO_CENTAVOS,
  });
  if (error) {
    const chave = Object.keys(ERROS_SAQUE).find((k) => error.message.includes(k));
    if (!chave) console.error("Falha ao solicitar saque", { afiliado: afiliado.id, error });
    return { erro: chave ? ERROS_SAQUE[chave] : "Não foi possível pedir o saque. Tente de novo." };
  }
  revalidatePath("/parceiro");
  return { mensagem: "Saque solicitado! A equipe confere e faz o Pix; acompanhe o andamento aqui." };
}
