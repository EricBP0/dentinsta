import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/sessao";

export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

// Só as rotas que usam login passam pelo proxy. A landing, a validação
// pública de certificado, o webhook e as imagens saem direto do CDN, sem
// esperar uma função rodar.
export const config = {
  matcher: [
    "/aluno/:path*",
    "/admin/:path*",
    "/assinar/:path*",
    "/renovar/:path*",
    "/pagamento/:path*",
    "/entrar",
    "/redefinir-senha",
  ],
};
