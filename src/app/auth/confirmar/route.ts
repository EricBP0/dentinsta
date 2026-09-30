import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { destinoSeguro } from "@/lib/url";

/**
 * Destino dos links enviados por e-mail (confirmação de cadastro e redefinição
 * de senha). Aceita os dois formatos do Supabase:
 * - token_hash + type (templates de e-mail personalizados — funciona em qualquer aparelho);
 * - code (templates padrão, fluxo PKCE — precisa abrir no mesmo navegador do cadastro).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const proximo = destinoSeguro(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const codigo = searchParams.get("code");

  const supabase = await criarClienteServidor();
  const { error } = tokenHash && tipo
    ? await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })
    : codigo
      ? await supabase.auth.exchangeCodeForSession(codigo)
      : { error: new Error("link sem token") };

  const destino = request.nextUrl.clone();
  destino.search = "";
  if (error) {
    destino.pathname = "/entrar";
    destino.searchParams.set("erro", "link");
  } else {
    const [caminho, consulta] = proximo.split("?");
    destino.pathname = caminho;
    if (consulta) destino.search = `?${consulta}`;
  }
  return NextResponse.redirect(destino);
}
