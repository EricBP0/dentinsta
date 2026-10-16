import "server-only";
import { cookies } from "next/headers";
import { COOKIE_AFILIADO, COOKIE_CUPOM, DIAS_DO_LINK } from "@/lib/afiliados";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Afiliado da visita: o cupom digitado manda; sem cupom, vale o link (/r/codigo).

export type AfiliadoDaVisita = {
  id: string;
  usuarioId: string | null;
  nome: string;
  /** Cupom aplicado (dá desconto); null se veio só pelo link de um afiliado sem cupom. */
  cupom: string | null;
  descontoPct: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Linha = { id: string; usuario_id: string | null; nome: string; cupom: string | null; desconto_pct: number };

export const opcoesCookieAfiliado = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: DIAS_DO_LINK * 24 * 60 * 60,
  path: "/",
};

export async function afiliadoPorCupom(cupom: string): Promise<Linha | null> {
  const { data } = await criarClienteAdmin()
    .from("afiliados")
    .select("id, usuario_id, nome, cupom, desconto_pct")
    .eq("cupom", cupom)
    .eq("ativo", true)
    .maybeSingle<Linha>();
  return data;
}

export async function afiliadoDaVisita(): Promise<AfiliadoDaVisita | null> {
  const jar = await cookies();
  const cupom = jar.get(COOKIE_CUPOM)?.value;
  const porCupom = cupom ? await afiliadoPorCupom(cupom) : null;
  if (porCupom) {
    return { id: porCupom.id, usuarioId: porCupom.usuario_id, nome: porCupom.nome, cupom: porCupom.cupom, descontoPct: Number(porCupom.desconto_pct) };
  }
  const ref = jar.get(COOKIE_AFILIADO)?.value;
  if (!ref || !UUID.test(ref)) return null;
  const { data } = await criarClienteAdmin()
    .from("afiliados")
    .select("id, usuario_id, nome, cupom, desconto_pct")
    .eq("id", ref)
    .eq("ativo", true)
    .maybeSingle<Linha>();
  return data ? { id: data.id, usuarioId: data.usuario_id, nome: data.nome, cupom: null, descontoPct: 0 } : null;
}
