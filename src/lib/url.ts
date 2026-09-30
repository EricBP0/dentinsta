import "server-only";
import { headers } from "next/headers";

/** Endereço público do site (links de e-mail, checkout, validação de certificado). */
export async function urlDoSite() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

/** Só aceita caminhos internos (evita redirecionar para outro site). */
export function destinoSeguro(valor: unknown, padrao = "/aluno") {
  const destino = typeof valor === "string" ? valor : "";
  return destino.startsWith("/") && !destino.startsWith("//") && !destino.startsWith("/\\") ? destino : padrao;
}
