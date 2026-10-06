// Espelho das tabelas em supabase/migrations/0001_base.sql.
import type { ConteudoResumo } from "@/lib/resumos/tipos";

export type Papel = "aluno" | "professor" | "admin";
export type StatusDisciplina = "rascunho" | "em_breve" | "publicada" | "arquivada";
export type StatusPublicacao = "rascunho" | "publicado";
export type TipoItem = "video" | "resumo" | "mapa_mental" | "flashcards" | "prova";

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
};

export type Disciplina = {
  id: string;
  slug: string;
  nome: string;
  descricao: string;
  capa_url: string | null;
  periodo_sugerido: number | null;
  carga_horaria_h: number;
  status: StatusDisciplina;
  publicar_em: string | null;
  primeira_publicacao_em: string | null;
  ordem: number;
};

export type Modulo = {
  id: string;
  disciplina_id: string;
  titulo: string;
  ordem: number;
  status: StatusPublicacao;
  publicar_em: string | null;
  primeira_publicacao_em: string | null;
};

// Sem a coluna `config`, que alunos só leem via conteudo_item().
export type Item = {
  id: string;
  modulo_id: string;
  tipo: TipoItem;
  titulo: string;
  ordem: number;
  obrigatorio: boolean;
  status: StatusPublicacao;
  publicar_em: string | null;
  primeira_publicacao_em: string | null;
};

export type ConfigItem = {
  video_url?: string; // URL de embed do provedor de vídeo (ex.: Panda Video)
  duracao_min?: number;
  conteudo?: string;
  pdf_url?: string;
  /** Resumo importado dos PDFs (scripts/resumos): texto estruturado do módulo. */
  resumo?: ConteudoResumo;
  /** PDF completo no bucket privado "resumos" e a página onde o módulo começa. */
  pdf_caminho?: string;
  pdf_pagina?: number;
  imagem_url?: string;
  nota_minima?: number;
};

export type AcessoRow = {
  usuario_id: string;
  compra_em: string;
  novidades_ate: string;
  ia_ate: string;
};

export const COLUNAS_ITEM =
  "id, modulo_id, tipo, titulo, ordem, obrigatorio, status, publicar_em, primeira_publicacao_em";

export const NOME_TIPO_ITEM: Record<TipoItem, string> = {
  video: "Videoaula",
  resumo: "Resumo",
  mapa_mental: "Mapa mental",
  flashcards: "Flashcards",
  prova: "Prova",
};

export const NOME_STATUS_DISCIPLINA: Record<StatusDisciplina, string> = {
  rascunho: "Rascunho",
  em_breve: "Em breve",
  publicada: "Publicada",
  arquivada: "Arquivada",
};
