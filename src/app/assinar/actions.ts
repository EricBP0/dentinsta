"use server";

import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth";
import { contatoDoFormulario, validarContato, type Contato, type EstadoContato } from "@/lib/cadastro";
import { contaParaPagamento, entrarSemSenha } from "@/lib/conta";
import { criarCheckout } from "@/lib/pagamento/asaas";
import { montarCheckoutAssinatura, type ModalidadeAnual } from "@/lib/pagamento/ofertas";
import { montarEscolha, type Escolha } from "@/lib/planos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { urlDoSite } from "@/lib/url";

function lerEscolha(formData: FormData) {
  const escolha = montarEscolha(
    String(formData.get("plano") ?? ""),
    String(formData.get("ciclo") ?? ""),
    formData.getAll("modulos").map(String),
  );
  const modalidade: ModalidadeAnual = formData.get("modalidade") === "parcelado" ? "parcelado" : "a_vista";
  return { escolha, modalidade };
}

/** Quem já paga uma assinatura que renova sozinha troca de plano por lá, sem abrir outra cobrança. */
async function temAssinaturaRecorrente(usuarioId: string) {
  const { data } = await criarClienteAdmin()
    .from("assinaturas")
    .select("id")
    .eq("usuario_id", usuarioId)
    .eq("status", "ativa")
    .eq("origem", "asaas")
    .gte("ativa_ate", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Cria a assinatura pendente e o checkout no Asaas; devolve o link de pagamento
 * (ou null se falhou). Gravada pelo servidor: o aluno não escreve em assinaturas.
 */
async function abrirCheckout(usuarioId: string, escolha: Escolha, modalidadeAnual: ModalidadeAnual, cliente?: Contato) {
  const admin = criarClienteAdmin();
  const { data: assinatura, error } = await admin
    .from("assinaturas")
    .insert({
      usuario_id: usuarioId,
      plano: escolha.plano,
      modulos: escolha.modulos,
      ciclo: escolha.ciclo,
      valor_centavos: escolha.valorCentavos,
      status: "pendente",
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !assinatura) return null;

  const corpo = { escolha, assinaturaId: assinatura.id, urlBase: await urlDoSite(), modalidadeAnual };
  try {
    let checkout;
    try {
      checkout = await criarCheckout(montarCheckoutAssinatura({ ...corpo, cliente }));
    } catch (erro) {
      if (!cliente) throw erro;
      // Se o Asaas recusar os dados pré-preenchidos, o aluno digita no checkout.
      console.warn("Checkout recusou os dados do cliente; tentando sem", { assinaturaId: assinatura.id, erro });
      checkout = await criarCheckout(montarCheckoutAssinatura(corpo));
    }
    await admin.from("assinaturas").update({ checkout_id: checkout.id }).eq("id", assinatura.id);
    return checkout.link;
  } catch (erro) {
    console.error("Falha ao criar checkout no Asaas", { assinaturaId: assinatura.id, erro });
    await admin.from("assinaturas").update({ status: "encerrada" }).eq("id", assinatura.id);
    return null;
  }
}

/** Botões de pagar da página de planos. Sem login, segue para os dados de contato. */
export async function iniciarAssinatura(formData: FormData) {
  const { perfil } = await obterSessao();
  const { escolha, modalidade } = lerEscolha(formData);
  if (!escolha) redirect("/assinar?erro=indisponivel");

  if (!perfil) {
    const params = new URLSearchParams({ plano: escolha.plano, ciclo: escolha.ciclo, modalidade });
    escolha.modulos.filter((m) => m !== "disciplinas").forEach((m) => params.append("modulos", m));
    redirect(`/assinar/dados?${params}`);
  }

  if (await temAssinaturaRecorrente(perfil.id)) redirect("/aluno/assinatura?aviso=ja_assina");
  const link = await abrirCheckout(perfil.id, escolha, modalidade);
  redirect(link ?? "/assinar?erro=falha");
}

/**
 * Pagar sem conta: nome, e-mail e WhatsApp. Cria a conta (sem senha) e já entra
 * com ela neste navegador. Se o e-mail já tinha conta, não entra sozinho (quem
 * digitou pode não ser o dono): paga e depois entra com a senha ou pelo link.
 */
export async function pagarSemConta(_: EstadoContato, formData: FormData): Promise<EstadoContato> {
  const valores = contatoDoFormulario(formData);
  if (formData.get("site")) return { erro: "Não foi possível continuar.", valores }; // campo isca para robôs
  const contato = validarContato(valores);
  if ("erro" in contato) return { ...contato, valores };
  const { escolha, modalidade } = lerEscolha(formData);
  if (!escolha) return { erro: "Plano indisponível. Volte e escolha de novo.", valores };

  let conta: { usuarioId: string; nova: boolean };
  try {
    conta = await contaParaPagamento(contato);
  } catch (erro) {
    console.error("Falha ao criar a conta no pagamento", { erro });
    return { erro: "Não foi possível continuar. Tente de novo em instantes.", valores };
  }
  if (!conta.nova && (await temAssinaturaRecorrente(conta.usuarioId))) {
    return { erro: "Este e-mail já tem uma assinatura ativa. Entre na sua conta para trocar de plano.", valores };
  }
  await criarClienteAdmin()
    .from("leads")
    .update({ usuario_id: conta.usuarioId, atualizado_em: new Date().toISOString() })
    .eq("email", contato.email);

  if (conta.nova) {
    try {
      await entrarSemSenha(contato.email);
    } catch (erro) {
      // Sem a sessão o pagamento segue; ele entra depois pelo e-mail de senha.
      console.error("Falha ao entrar com a conta nova", { usuarioId: conta.usuarioId, erro });
    }
  }
  const link = await abrirCheckout(conta.usuarioId, escolha, modalidade, contato);
  if (!link) return { erro: "Não foi possível abrir o pagamento. Tente de novo em instantes.", valores };
  redirect(link);
}
