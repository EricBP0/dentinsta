// Planos, módulos e preços da assinatura (puros, testáveis). Mudou um preço?
// É só aqui; a cobrança no Asaas usa estes valores.

export const MODULOS = {
  disciplinas: {
    nome: "Disciplinas",
    descricao: "Videoaulas, resumos, mapas mentais, provas e certificados",
    precoCentavos: 1490,
  },
  simulados: { nome: "Simulados", descricao: "Simulados com correção das discursivas por IA", precoCentavos: 1490 },
  flashcards: { nome: "Flashcards", descricao: "Revisão com repetição espaçada", precoCentavos: 990 },
  chat: { nome: "Chat IA", descricao: "Tire dúvidas de Odontologia com a IA", precoCentavos: 1790 },
  consultorio: { nome: "Consultório", descricao: "Agenda, pacientes, caixa e provas", precoCentavos: 990 },
} as const;
export type Modulo = keyof typeof MODULOS;
export const TODOS_MODULOS = Object.keys(MODULOS) as Modulo[];
/** Módulos que se somam ao Essencial (Disciplinas vem sempre). */
export const AVULSOS = TODOS_MODULOS.filter((m) => m !== "disciplinas");

export type Plano = "essencial" | "completo" | "duplo";
export type Ciclo = "mensal" | "anual";

export const PLANOS = {
  essencial: { nome: "Essencial", resumo: "Disciplinas, e você escolhe o que somar", pessoas: 1 },
  completo: { nome: "Completo", resumo: "Tudo da plataforma", pessoas: 1 },
  duplo: { nome: "Duplo", resumo: "Tudo da plataforma para você e mais uma pessoa", pessoas: 2 },
} as const;

/** Preço mensal dos planos fechados; anual = 10 mensalidades (2 meses grátis). */
export const PRECO_MENSAL = { completo: 3490, duplo: 5990 } as const;
export const PRECO_ANUAL = { completo: 34900, duplo: 59900 } as const;
export const DIAS_DE_TOLERANCIA = 3;

export function ehPlano(valor: string): valor is Plano {
  return valor in PLANOS;
}

export function ehModulo(valor: string): valor is Modulo {
  return valor in MODULOS;
}

/** Módulos de um plano. No Essencial: Disciplinas + os avulsos escolhidos. */
export function modulosDoPlano(plano: Plano, avulsos: readonly string[] = []): Modulo[] {
  if (plano !== "essencial") return [...TODOS_MODULOS];
  return ["disciplinas", ...AVULSOS.filter((m) => avulsos.includes(m))];
}

/** Soma dos módulos comprados separadamente (a "âncora" do Completo). */
export function somaAvulsos(modulos: readonly Modulo[] = TODOS_MODULOS): number {
  return modulos.reduce((soma, m) => soma + MODULOS[m].precoCentavos, 0);
}

export type Escolha = { plano: Plano; ciclo: Ciclo; modulos: Modulo[]; valorCentavos: number };

/**
 * Valida a escolha do formulário e calcula o preço. Anual só no Completo e no
 * Duplo; o Essencial com todos os avulsos vira Completo (sai mais barato).
 */
export function montarEscolha(plano: string, ciclo: string, avulsos: readonly string[] = []): Escolha | null {
  if (!ehPlano(plano)) return null;
  const cicloValido: Ciclo = ciclo === "anual" ? "anual" : "mensal";
  if (plano === "essencial") {
    if (cicloValido === "anual") return null;
    const modulos = modulosDoPlano("essencial", avulsos);
    if (modulos.length === TODOS_MODULOS.length) return montarEscolha("completo", "mensal");
    return { plano, ciclo: "mensal", modulos, valorCentavos: somaAvulsos(modulos) };
  }
  return {
    plano,
    ciclo: cicloValido,
    modulos: [...TODOS_MODULOS],
    valorCentavos: cicloValido === "anual" ? PRECO_ANUAL[plano] : PRECO_MENSAL[plano],
  };
}

/**
 * Upsell de toda compra do Essencial: quanto falta (ou sobra, se for negativo)
 * para levar o Completo e quais módulos ele ganharia.
 */
export function upsellParaCompleto(escolha: Escolha): { diferencaCentavos: number; modulosGanhos: Modulo[] } | null {
  if (escolha.plano !== "essencial") return null;
  const diferenca = PRECO_MENSAL.completo - escolha.valorCentavos;
  return {
    diferencaCentavos: diferenca,
    modulosGanhos: TODOS_MODULOS.filter((m) => !escolha.modulos.includes(m)),
  };
}

/** Descrição curta para o checkout e o histórico ("Essencial + Simulados"). */
export function nomeDaEscolha(escolha: Pick<Escolha, "plano" | "ciclo" | "modulos">): string {
  const base = PLANOS[escolha.plano].nome;
  const extras =
    escolha.plano === "essencial"
      ? escolha.modulos.filter((m) => m !== "disciplinas").map((m) => MODULOS[m].nome)
      : [];
  return [base, ...extras].join(" + ") + (escolha.ciclo === "anual" ? " (anual)" : "");
}

/**
 * Mudança de plano no meio do ciclo: subir (ganha módulo ou pessoa) vale na
 * hora; descer vale na próxima cobrança.
 */
export function ehUpgrade(atual: { plano: Plano; modulos: readonly string[] }, nova: Escolha): boolean {
  if (atual.plano === "duplo") return false;
  if (nova.plano === "duplo") return true;
  return nova.modulos.some((m) => !atual.modulos.includes(m));
}
