import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave secreta: ignora o RLS. Use só no servidor e só para o que
 * o aluno não pode fazer sozinho (gravar a nota da IA, contar a cota).
 */
export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) throw new Error("SUPABASE_SECRET_KEY não configurada");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
