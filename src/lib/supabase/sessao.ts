import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /parceiro passa pelo proxy só para renovar a sessão (o login dele é /parceiro/entrar).
// /assinar e /pagamento abrem sem login: os dados de contato são pedidos na
// hora de pagar e a conta é criada nesse momento.
const ROTAS_PROTEGIDAS = ["/aluno", "/admin", "/renovar"];

// Renova a sessão do Supabase a cada navegação e protege as áreas logadas.
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!logado && ROTAS_PROTEGIDAS.some((rota) => pathname.startsWith(rota))) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    // Mantém a busca (ex.: plano escolhido) para voltar ao mesmo lugar depois do login.
    url.search = `?proximo=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  return response;
}
