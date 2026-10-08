import "server-only";
import { redirect } from "next/navigation";
import { exigirLogin } from "@/lib/auth";
import { carregarAcesso } from "@/lib/catalogo";

/** A ClinicaON é de quem tem acesso à plataforma (mesmo com a IA vencida) e da equipe. */
export async function exigirClinica() {
  const sessao = await exigirLogin();
  if (sessao.perfil.papel !== "aluno") return sessao;
  const acesso = await carregarAcesso(sessao.supabase, sessao.perfil);
  if (!acesso) redirect("/assinar");
  return sessao;
}
