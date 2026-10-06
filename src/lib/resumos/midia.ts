import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { ConfigItem } from "@/lib/tipos";
import { figurasDoResumo } from "./tipos";

export const BUCKET_RESUMOS = "resumos";
/** Validade dos links: o bastante para uma sessão de estudo. */
const VALIDADE_S = 60 * 60 * 3;

export type MidiaResumo = { figuras: Record<string, string>; pdf: string | null };

/**
 * Gera links temporários para o PDF e as figuras de um resumo. Só chame com o
 * config devolvido por conteudo_item(), que já confere se o aluno tem acesso.
 */
export async function assinarMidiaResumo(config: ConfigItem): Promise<MidiaResumo> {
  const figuras = config.resumo ? figurasDoResumo(config.resumo) : [];
  const caminhos = [...new Set(config.pdf_caminho ? [...figuras, config.pdf_caminho] : figuras)];
  if (caminhos.length === 0) return { figuras: {}, pdf: null };

  const { data, error } = await criarClienteAdmin().storage.from(BUCKET_RESUMOS).createSignedUrls(caminhos, VALIDADE_S);
  if (error) {
    console.error("Falha ao assinar a mídia do resumo", error);
    return { figuras: {}, pdf: null };
  }

  const urls: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  const pdf = config.pdf_caminho ? urls[config.pdf_caminho] ?? null : null;
  return {
    figuras: urls,
    // O leitor de PDF do navegador abre direto na página do módulo.
    pdf: pdf && config.pdf_pagina ? `${pdf}#page=${config.pdf_pagina}` : pdf,
  };
}
