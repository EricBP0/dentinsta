// Planos, módulos e preços da assinatura (puros, testáveis). Mudou um preço?
// É só aqui; a cobrança no Asaas usa estes valores.

export const MODULOS = {
  disciplinas: {
    nome: "Disciplinas",
    descricao: "Videoaulas, resumos, mapas mentais, provas e certificados",
    precoCentavos: 2290,
  },
  simulados: { nome: "Simulados", descricao: "Simulados com correção das discursivas por IA", precoCentavos: 2290 },
  flashcards: { nome: "Flashcards", descricao: "Revisão com repetição espaçada", precoCentavos: 1490 },
  chat: { nome: "Chat IA", descricao: "Tire dúvidas de Odontologia com a IA", precoCentavos: 2690 },
  consultorio: { nome: "Consultório", descricao: "Agenda, pacientes, caixa e provas", precoCentavos: 1490 },
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

/** Mensalidade de cada plano (no Essencial, só com as Disciplinas). */
export const PRECO_MENSAL = { essencial: MODULOS.disciplinas.precoCentavos, completo: 4990, duplo: 7990 } as const;
/**
 * Anual: 12x sem juros desta parcela (o total à vista é o mesmo). No Essencial,
 * o anual é só com as Disciplinas; módulos avulsos são só no mensal.
 */
export const PARCELA_ANUAL = { essencial: 1490, completo: 3490, duplo: 5990 } as const;
export const PRECO_ANUAL = {
  essencial: PARCELA_ANUAL.essencial * 12,
  completo: PARCELA_ANUAL.completo * 12,
  duplo: PARCELA_ANUAL.duplo * 12,
} as const;
/** Quanto o anual economiza em relação a 12 mensalidades. */
export function economiaAnual(plano: Plano): number {
  return PRECO_MENSAL[plano] * 12 - PRECO_ANUAL[plano];
}
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
 * Valida a escolha do formulário e calcula o preço. O Essencial anual é só com
 * as Disciplinas; o Essencial com todos os avulsos vira Completo (sai mais barato).
 */
export function montarEscolha(plano: string, ciclo: string, avulsos: readonly string[] = []): Escolha | null {
  if (!ehPlano(plano)) return null;
  const cicloValido: Ciclo = ciclo === "anual" ? "anual" : "mensal";
  if (plano === "essencial") {
    if (cicloValido === "anual") {
      if (AVULSOS.some((m) => avulsos.includes(m))) return null;
      return { plano, ciclo: "anual", modulos: ["disciplinas"], valorCentavos: PRECO_ANUAL.essencial };
    }
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

/** Valor por mês: a mensalidade, ou a parcela do anual (12x sem juros). */
export function valorPorMes(escolha: Pick<Escolha, "ciclo" | "valorCentavos">): number {
  return escolha.ciclo === "anual" ? escolha.valorCentavos / 12 : escolha.valorCentavos;
}

/**
 * Upsell de toda compra do Essencial: o Completo no mesmo ciclo, quanto falta
 * por mês (ou sobra, se for negativo) e quais módulos ele ganharia.
 */
export function upsellParaCompleto(
  escolha: Escolha,
): { completo: Escolha; diferencaCentavos: number; modulosGanhos: Modulo[] } | null {
  if (escolha.plano !== "essencial") return null;
  const completo = montarEscolha("completo", escolha.ciclo)!;
  return {
    completo,
    diferencaCentavos: valorPorMes(completo) - valorPorMes(escolha),
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
