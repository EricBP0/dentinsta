"use server";

import { redirect } from "next/navigation";
import { exigirLogin } from "@/lib/auth";
import { criarCheckout } from "@/lib/pagamento/asaas";
import { montarCheckoutAssinatura, type ModalidadeAnual } from "@/lib/pagamento/ofertas";
import { montarEscolha } from "@/lib/planos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { urlDoSite } from "@/lib/url";

/** Cria a assinatura pendente, abre o checkout no Asaas e leva o aluno para pagar. */
export async function iniciarAssinatura(formData: FormData) {
  const { supabase, perfil } = await exigirLogin();
  const escolha = montarEscolha(
    String(formData.get("plano") ?? ""),
    String(formData.get("ciclo") ?? ""),
    formData.getAll("modulos").map(String),
  );
  if (!escolha) redirect("/assinar?erro=indisponivel");
  const modalidadeAnual: ModalidadeAnual = formData.get("modalidade") === "parcelado" ? "parcelado" : "a_vista";

  // Quem já paga uma assinatura que renova sozinha troca de plano por lá, sem
  // abrir uma segunda cobrança.
  const { data: ativa } = await supabase
    .from("assinaturas")
    .select("id")
    .eq("usuario_id", perfil.id)
    .eq("status", "ativa")
    .eq("origem", "asaas")
    .gte("ativa_ate", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (ativa) redirect("/aluno/assinatura?aviso=ja_assina");

  // Gravada pelo servidor: o aluno não tem permissão de escrita em assinaturas.
  const admin = criarClienteAdmin();
  const { data: assinatura, error } = await admin
    .from("assinaturas")
    .insert({
      usuario_id: perfil.id,
      plano: escolha.plano,
      modulos: escolha.modulos,
      ciclo: escolha.ciclo,
      valor_centavos: escolha.valorCentavos,
      status: "pendente",
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !assinatura) redirect("/assinar?erro=falha");

  let link: string;
  try {
    const checkout = await criarCheckout(
      montarCheckoutAssinatura({ escolha, assinaturaId: assinatura.id, urlBase: await urlDoSite(), modalidadeAnual }),
    );
    await admin.from("assinaturas").update({ checkout_id: checkout.id }).eq("id", assinatura.id);
    link = checkout.link;
  } catch (erro) {
    console.error("Falha ao criar checkout no Asaas", { assinaturaId: assinatura.id, erro });
    await admin.from("assinaturas").update({ status: "encerrada" }).eq("id", assinatura.id);
    redirect("/assinar?erro=falha");
  }
  redirect(link);
}
