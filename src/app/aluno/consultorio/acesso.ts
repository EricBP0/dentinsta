import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { exigirLogin } from "@/lib/auth";
import { temModulo } from "@/lib/acesso";
import { carregarAcesso } from "@/lib/catalogo";

/** O Consultório é de quem tem o módulo no plano (e da equipe). Uma consulta por requisição. */
export const podeUsarConsultorio = cache(async () => {
  const sessao = await exigirLogin();
  if (sessao.perfil.papel !== "aluno") return { ...sessao, liberado: true, temAssinatura: true };
  const acesso = await carregarAcesso(sessao.supabase, sessao.perfil);
  return { ...sessao, liberado: temModulo(acesso, "consultorio"), temAssinatura: acesso !== null };
});

/** Para páginas e actions: sem o módulo, vai para os planos. */
export async function exigirConsultorio() {
  const { liberado, supabase, perfil } = await podeUsarConsultorio();
  if (!liberado) redirect("/assinar?modulo=consultorio");
  return { supabase, perfil };
}
