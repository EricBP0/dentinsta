"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirLogin } from "@/lib/auth";
import { atualizarValorAssinatura, cancelarAssinaturaAsaas } from "@/lib/pagamento/asaas";
import { ehUpgrade, montarEscolha, nomeDaEscolha, type Plano } from "@/lib/planos";
import { criarClienteAdmin } from "@/lib/supabase/admin";

type Minha = {
  id: string;
  plano: Plano;
  modulos: string[];
  ciclo: "mensal" | "anual";
  gateway_assinatura_id: string | null;
};

/** A assinatura mensal ativa do aluno logado, como titular. */
async function assinaturaMensalAtiva() {
  const { supabase, perfil } = await exigirLogin();
  const { data } = await supabase
    .from("assinaturas")
    .select("id, plano, modulos, ciclo, gateway_assinatura_id")
    .eq("usuario_id", perfil.id)
    .eq("status", "ativa")
    .eq("origem", "asaas")
    .gte("ativa_ate", new Date().toISOString())
    .order("ativa_ate", { ascending: false })
    .limit(1)
    .maybeSingle<Minha>();
  return data;
}

function voltar(aviso: string): never {
  revalidatePath("/aluno", "layout");
  redirect(`/aluno/assinatura?aviso=${aviso}`);
}

/**
 * Troca de plano da assinatura mensal. Subir (ganhar módulo ou o Duplo) vale
 * na hora; descer vale na próxima cobrança. A diferença de preço entra na
 * próxima cobrança do Asaas.
 */
export async function trocarPlano(formData: FormData) {
  const atual = await assinaturaMensalAtiva();
  if (!atual) voltar("sem_assinatura");
  if (!atual.gateway_assinatura_id) voltar("aguarde_confirmacao");

  const nova = montarEscolha(String(formData.get("plano") ?? ""), "mensal", formData.getAll("modulos").map(String));
  if (!nova) voltar("plano_invalido");
  const mesmaCoisa =
    nova.plano === atual.plano && nova.modulos.length === atual.modulos.length && nova.modulos.every((m) => atual.modulos.includes(m));
  if (mesmaCoisa) voltar("sem_mudanca");

  try {
    await atualizarValorAssinatura(atual.gateway_assinatura_id, nova.valorCentavos, `OdontoLab ${nomeDaEscolha(nova)}`);
  } catch (erro) {
    console.error("Falha ao trocar o valor da assinatura no Asaas", { assinaturaId: atual.id, erro });
    voltar("falha");
  }

  const upgrade = ehUpgrade(atual, nova);
  const admin = criarClienteAdmin();
  await admin
    .from("assinaturas")
    .update(
      upgrade
        ? { plano: nova.plano, modulos: nova.modulos, valor_centavos: nova.valorCentavos, plano_proximo: null, modulos_proximos: null }
        : { valor_centavos: nova.valorCentavos, plano_proximo: nova.plano, modulos_proximos: nova.modulos },
    )
    .eq("id", atual.id);
  voltar(upgrade ? "plano_trocado" : "troca_agendada");
}

/** Desfaz uma redução de plano que ainda não entrou em vigor. */
export async function desfazerReducao() {
  const atual = await assinaturaMensalAtiva();
  if (!atual?.gateway_assinatura_id) voltar("sem_assinatura");
  const escolha = montarEscolha(atual.plano, "mensal", atual.modulos);
  if (!escolha) voltar("falha");
  try {
    await atualizarValorAssinatura(atual.gateway_assinatura_id, escolha.valorCentavos, `OdontoLab ${nomeDaEscolha(escolha)}`);
  } catch (erro) {
    console.error("Falha ao desfazer a redução no Asaas", { assinaturaId: atual.id, erro });
    voltar("falha");
  }
  await criarClienteAdmin()
    .from("assinaturas")
    .update({ valor_centavos: escolha.valorCentavos, plano_proximo: null, modulos_proximos: null })
    .eq("id", atual.id);
  voltar("reducao_desfeita");
}

/** Cancela a renovação: o aluno usa até o fim do período já pago. */
export async function cancelarAssinatura(formData: FormData) {
  if (formData.get("confirmo") !== "sim") voltar("confirme");
  const atual = await assinaturaMensalAtiva();
  if (!atual) voltar("sem_assinatura");
  if (atual.gateway_assinatura_id) {
    try {
      await cancelarAssinaturaAsaas(atual.gateway_assinatura_id);
    } catch (erro) {
      console.error("Falha ao cancelar no Asaas", { assinaturaId: atual.id, erro });
      voltar("falha");
    }
  }
  await criarClienteAdmin()
    .from("assinaturas")
    .update({ status: "cancelada", cancelada_em: new Date().toISOString(), plano_proximo: null, modulos_proximos: null })
    .eq("id", atual.id);
  voltar("cancelada");
}

const ERROS_CONVITE: Record<string, string> = {
  sem_plano_duplo: "sem_duplo",
  email_invalido: "email_invalido",
  convidado_e_titular: "convite_proprio",
  troca_recente: "troca_recente",
};

/** Duplo: define (ou tira, com e-mail vazio) a segunda pessoa do plano. */
export async function definirConvidado(formData: FormData) {
  const { supabase } = await exigirLogin();
  const email = String(formData.get("email") ?? "").trim();
  const { error } = await supabase.rpc("definir_convidado", { p_email: email });
  if (error) {
    const chave = Object.keys(ERROS_CONVITE).find((k) => error.message.includes(k));
    voltar(chave ? ERROS_CONVITE[chave] : "falha");
  }
  voltar(email ? "convite_salvo" : "convite_removido");
}
