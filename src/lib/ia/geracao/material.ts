// Converte o material enviado (PDF, Word, texto, imagens) nas partes que vão
// para a IA (qualquer provedor). PDFs e imagens vão direto — o modelo lê o texto
// e as figuras. Word (.docx) vira texto.

import type { Parte } from "@/lib/ia/provedores/tipos";

export type ArquivoMaterial = { nome: string; tipo: string; dados: Buffer };

export type TipoArquivo = "pdf" | "texto" | "docx" | "imagem";

const IMAGENS = {
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
} as const;

// A requisição à API aceita até 32 MB; base64 aumenta ~33%.
export const LIMITE_TOTAL_BYTES = 22 * 1024 * 1024;
export const LIMITE_IMAGEM_BYTES = 5 * 1024 * 1024;
export const MAX_ARQUIVOS = 10;

export const EXTENSOES_ACEITAS = ".pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.gif";

export function tipoDoArquivo(nome: string, mime: string): TipoArquivo | null {
  const ext = nome.toLowerCase().split(".").pop() ?? "";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (ext === "docx" || mime.includes("wordprocessingml")) return "docx";
  if (mime in IMAGENS || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "imagem";
  if (mime.startsWith("text/") || ["txt", "md", "csv"].includes(ext)) return "texto";
  return null;
}

export function mimeDoArquivo(nome: string, mime: string): string {
  if (mime) return mime;
  const ext = nome.toLowerCase().split(".").pop() ?? "";
  const porExtensao: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };
  return porExtensao[ext] ?? "application/octet-stream";
}

/** Valida tamanho e formato antes de enviar (no navegador e no servidor). */
export function validarArquivos(arquivos: { nome: string; tipo: string; tamanho: number }[]): string | null {
  if (arquivos.length > MAX_ARQUIVOS) return `Envie no máximo ${MAX_ARQUIVOS} arquivos por vez.`;
  let total = 0;
  for (const a of arquivos) {
    const tipo = tipoDoArquivo(a.nome, a.tipo);
    if (!tipo) return `Formato não aceito: ${a.nome}. Use PDF, Word (.docx), texto ou imagem.`;
    if (tipo === "imagem" && a.tamanho > LIMITE_IMAGEM_BYTES) return `Imagem maior que 5 MB: ${a.nome}.`;
    total += a.tamanho;
  }
  if (total > LIMITE_TOTAL_BYTES) {
    return "Material maior que 22 MB no total. Divida em mais de uma geração (ex.: um capítulo por vez).";
  }
  return null;
}

async function textoDoDocx(dados: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: dados });
  return value;
}

export async function montarBlocosMaterial(arquivos: ArquivoMaterial[], textoColado: string): Promise<Parte[]> {
  const partes: Parte[] = [];

  for (const arquivo of arquivos) {
    const tipo = tipoDoArquivo(arquivo.nome, arquivo.tipo);
    if (tipo === "pdf") {
      partes.push({ tipo: "pdf", nome: arquivo.nome, dados: arquivo.dados });
    } else if (tipo === "imagem") {
      const mime = mimeDoArquivo(arquivo.nome, arquivo.tipo) as keyof typeof IMAGENS;
      partes.push({ tipo: "imagem", nome: arquivo.nome, mime: IMAGENS[mime] ?? "image/jpeg", dados: arquivo.dados });
    } else if (tipo === "docx" || tipo === "texto") {
      const texto = tipo === "docx" ? await textoDoDocx(arquivo.dados) : arquivo.dados.toString("utf8");
      if (texto.trim()) partes.push({ tipo: "texto", titulo: arquivo.nome, texto });
    }
  }

  if (textoColado.trim()) partes.push({ tipo: "texto", titulo: "Texto enviado pelo professor", texto: textoColado });
  return partes;
}
