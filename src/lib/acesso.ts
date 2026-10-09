// Regras de acesso do aluno: assinatura ativa + módulos do plano.
// A mesma regra é aplicada no banco (meus_modulos, modulo_do_item e
// pode_acessar_item, migration 0014) — manter as duas iguais.

import { TODOS_MODULOS, type Ciclo, type Modulo, type Plano } from "@/lib/planos";
import type { TipoItem } from "@/lib/tipos";

export type Acesso = {
  assinaturaId: string;
  plano: Plano;
  ciclo: Ciclo;
  modulos: Modulo[];
  /** ativa: renova sozinha; cancelada: vale até ativaAte e não renova. */
  status: "ativa" | "cancelada";
  /** Fim do período pago (sem a tolerância). */
  periodoAte: Date | null;
  ativaAte: Date;
  /** false: é o convidado de um plano Duplo. */
  titular: boolean;
  origem: "asaas" | "manual";
};

/** "liberado": pode abrir. "bloqueado": o plano não inclui. "sem_acesso": sem assinatura. */
export type SituacaoItem = "liberado" | "bloqueado" | "sem_acesso";

/** Módulo que libera cada tipo de item (igual a modulo_do_item no banco). */
export function moduloDoItem(tipo: TipoItem): Modulo {
  return tipo === "flashcards" ? "flashcards" : "disciplinas";
}

/** A equipe usa tudo (para testar); o aluno, o que o plano dele tem. */
export function temModulo(acesso: Acesso | null, modulo: Modulo, equipe = false, agora: Date = new Date()): boolean {
  if (equipe) return true;
  return acesso !== null && agora.getTime() <= acesso.ativaAte.getTime() && acesso.modulos.includes(modulo);
}

export function situacaoItem(params: { acesso: Acesso | null; tipo: TipoItem; equipe?: boolean }): SituacaoItem {
  if (params.equipe) return "liberado";
  if (!params.acesso) return "sem_acesso";
  return temModulo(params.acesso, moduloDoItem(params.tipo)) ? "liberado" : "bloqueado";
}

/** Linha de assinaturas como vem do banco. */
export type AssinaturaRow = {
  id: string;
  usuario_id: string;
  plano: Plano;
  ciclo: Ciclo;
  modulos: string[];
  status: string;
  periodo_ate: string | null;
  ativa_ate: string | null;
  origem: "asaas" | "manual";
};

export const COLUNAS_ASSINATURA = "id, usuario_id, plano, ciclo, modulos, status, periodo_ate, ativa_ate, origem";

/**
 * Junta as assinaturas válidas do usuário (normalmente uma) num acesso só:
 * a de prazo mais longo manda, e os módulos de todas se somam.
 */
export function acessoDasAssinaturas(linhas: AssinaturaRow[], usuarioId: string, agora: Date = new Date()): Acesso | null {
  const validas = linhas
    .filter((l) => (l.status === "ativa" || l.status === "cancelada") && l.ativa_ate && new Date(l.ativa_ate) >= agora)
    .sort((a, b) => new Date(b.ativa_ate!).getTime() - new Date(a.ativa_ate!).getTime());
  if (!validas.length) return null;
  const principal = validas.find((l) => l.usuario_id === usuarioId) ?? validas[0];
  const modulos = TODOS_MODULOS.filter((m) => validas.some((l) => l.modulos.includes(m)));
  return {
    assinaturaId: principal.id,
    plano: principal.plano,
    ciclo: principal.ciclo,
    modulos,
    status: principal.status as Acesso["status"],
    periodoAte: paraData(principal.periodo_ate),
    ativaAte: new Date(principal.ativa_ate!),
    titular: principal.usuario_id === usuarioId,
    origem: principal.origem,
  };
}

export function paraData(valor: string | null): Date | null {
  return valor ? new Date(valor) : null;
}
