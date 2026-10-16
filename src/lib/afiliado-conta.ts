import "server-only";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export type Afiliado = {
  id: string;
  usuario_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  documento: string | null;
  codigo: string;
  cupom: string | null;
  comissao_pct: number;
  desconto_pct: number;
  ativo: boolean;
  chave_pix: string | null;
  tipo_chave_pix: string | null;
  chave_pix_alterada_em: string | null;
  criado_em: string;
};

export const COLUNAS_AFILIADO =
  "id, usuario_id, nome, email, telefone, documento, codigo, cupom, comissao_pct, desconto_pct, ativo, chave_pix, tipo_chave_pix, chave_pix_alterada_em, criado_em";

/**
 * Área de parceiros: precisa de login e de um cadastro de afiliado ativo ligado
 * à conta. As consultas da área usam o id devolvido aqui (cliente admin).
 */
export async function exigirAfiliado() {
  const { perfil } = await obterSessao();
  if (!perfil) redirect("/parceiro/entrar");
  const { data: afiliado } = await criarClienteAdmin()
    .from("afiliados")
    .select(COLUNAS_AFILIADO)
    .eq("usuario_id", perfil.id)
    .eq("ativo", true)
    .maybeSingle<Afiliado>();
  return { perfil, afiliado };
}
