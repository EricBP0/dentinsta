import "server-only";
import { cookies } from "next/headers";
import { formatarTelefone, type Contato } from "@/lib/cadastro";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Lead do "Quero conhecer": o cookie guarda o id para não pedir os dados de
// novo na hora de pagar.
export const COOKIE_LEAD = "odl_lead";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function contatoDoLead(): Promise<Contato | null> {
  const id = (await cookies()).get(COOKIE_LEAD)?.value;
  if (!id || !UUID.test(id)) return null;
  const { data } = await criarClienteAdmin()
    .from("leads")
    .select("nome, email, telefone")
    .eq("id", id)
    .maybeSingle<Contato>();
  return data ? { ...data, telefone: formatarTelefone(data.telefone) } : null;
}
