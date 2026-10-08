import comThumb from "./thumbs.json";

const slugs = new Set<string>(comThumb);

/** Arte vertical da disciplina (gerada por scripts/resumos/thumbs.mjs), se houver. */
export function thumbDaDisciplina(slug: string): string | null {
  return slugs.has(slug) ? `/thumbs/${slug}.jpg` : null;
}

/** Título do conteúdo sem o prefixo do tipo ("Resumo: ", "Flashcards: "), que a thumb já mostra. */
export function tituloSemTipo(titulo: string): string {
  return titulo.replace(/^(resumo|flashcards|videoaula|mapa mental|prova)\s*:\s*/i, "");
}
