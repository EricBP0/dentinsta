import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_AFILIADO, COOKIE_CUPOM } from "@/lib/afiliados";
import { opcoesCookieAfiliado } from "@/lib/afiliado-visita";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { destinoSeguro } from "@/lib/url";

/**
 * Link do afiliado: odontolab.online/r/<codigo> (opcional: ?para=/assinar).
 * Marca a visita por 30 dias, já aplica o cupom do afiliado e conta o clique.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/r/[codigo]">) {
  const { codigo } = await params;
  const destino = new URL(destinoSeguro(request.nextUrl.searchParams.get("para"), "/"), request.nextUrl.origin);
  const resposta = NextResponse.redirect(destino);

  const admin = criarClienteAdmin();
  const { data: afiliado } = await admin
    .from("afiliados")
    .select("id, cupom")
    .eq("codigo", codigo.toLowerCase())
    .eq("ativo", true)
    .maybeSingle<{ id: string; cupom: string | null }>();
  if (!afiliado) return resposta;

  // Conta o clique uma vez por visitante (enquanto o cookie durar).
  if (request.cookies.get(COOKIE_AFILIADO)?.value !== afiliado.id) {
    await admin.from("afiliado_cliques").insert({ afiliado_id: afiliado.id });
  }
  resposta.cookies.set(COOKIE_AFILIADO, afiliado.id, opcoesCookieAfiliado);
  if (afiliado.cupom) resposta.cookies.set(COOKIE_CUPOM, afiliado.cupom, opcoesCookieAfiliado);
  return resposta;
}
