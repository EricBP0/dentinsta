"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { exigirLogin } from "@/lib/auth";
import { criarCheckout } from "@/lib/pagamento/asaas";
import { montarCheckout, obterOferta, type Modalidade, type TipoCompra } from "@/lib/pagamento/ofertas";
import { criarClienteAdmin } from "@/lib/supabase/admin";

async function urlBase() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

/** Cria a compra pendente, abre o checkout no Asaas e redireciona o aluno para pagar. */
export async function iniciarCheckout(formData: FormData) {
  const { supabase, perfil } = await exigirLogin();
  const tipo: TipoCompra = formData.get("tipo") === "renovacao" ? "renovacao" : "compra";
  const modalidade: Modalidade = formData.get("modalidade") === "parcelado" ? "parcelado" : "a_vista";
  const pagina = tipo === "renovacao" ? "/renovar" : "/assinar";

  const oferta = obterOferta(tipo, modalidade);
  if (!oferta) redirect(`${pagina}?erro=indisponivel`);

  const { data: acesso } = await supabase
    .from("acessos")
    .select("novidades_ate")
    .eq("usuario_id", perfil.id)
    .maybeSingle<{ novidades_ate: string }>();
  if (tipo === "compra" && acesso) redirect("/renovar");
  if (tipo === "renovacao" && !acesso) redirect("/assinar");

  // A compra é gravada pelo servidor (o aluno não tem permissão de escrita em compras).
  const admin = criarClienteAdmin();
  const { data: compra, error } = await admin
    .from("compras")
    .insert({
      usuario_id: perfil.id,
      tipo,
      modalidade,
      parcelas: oferta.parcelas,
      metodo: modalidade === "parcelado" ? "cartao" : null,
      valor_total_centavos: oferta.valorCentavos,
      status: "pendente",
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !compra) redirect(`${pagina}?erro=falha`);

  let link: string;
  try {
    const checkout = await criarCheckout(montarCheckout({ oferta, compraId: compra.id, urlBase: await urlBase() }));
    await admin.from("compras").update({ checkout_id: checkout.id }).eq("id", compra.id);
    link = checkout.link;
  } catch (erro) {
    console.error("Falha ao criar checkout no Asaas", { compraId: compra.id, erro });
    await admin.from("compras").update({ status: "cancelado" }).eq("id", compra.id);
    redirect(`${pagina}?erro=falha`);
  }
  redirect(link);
}
