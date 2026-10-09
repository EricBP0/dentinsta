// Qual modelo atende cada uso da IA, em ordem de preferência. O primeiro que
// responder vale; se ele falhar ou recusar, o próximo da lista tenta.
//
// Variáveis (opcionais), uma lista separada por vírgula de "provedor:modelo":
//   IA_CORRECAO=gemini:gemini-3.6-flash,anthropic:claude-opus-5-5
//   IA_CHAT=...    IA_GERACAO=...
// Provedores sem chave (GEMINI_API_KEY, ANTHROPIC_API_KEY) são pulados.

import type { Alvo, Esforco, NomeProvedor, Uso } from "./tipos";

export type UsoIA = "correcao" | "chat" | "geracao";

const PROVEDORES: NomeProvedor[] = ["gemini", "anthropic"];

/** Padrão: Gemini 3.6 Flash, com o Claude de reserva. */
const PADRAO_GEMINI = "gemini-3.6-flash";
const PADRAO_CLAUDE = "claude-opus-5-5";

/** Variável da lista e a variável antiga que só escolhia o modelo do Claude. */
const VARIAVEIS: Record<UsoIA, { lista: string; modeloClaudeAntigo: string }> = {
  correcao: { lista: "IA_CORRECAO", modeloClaudeAntigo: "IA_MODELO" },
  chat: { lista: "IA_CHAT", modeloClaudeAntigo: "IA_MODELO_CHAT" },
  geracao: { lista: "IA_GERACAO", modeloClaudeAntigo: "IA_MODELO_GERACAO" },
};

/** "gemini:gemini-3.6-flash, claude-haiku-5-5" → alvos. Sem prefixo, deduz pelo nome. */
export function lerLista(texto: string): Alvo[] {
  return texto
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item): Alvo[] => {
      const [prefixo, ...resto] = item.split(":");
      if (resto.length && PROVEDORES.includes(prefixo as NomeProvedor) && resto.join(":").trim()) {
        return [{ provedor: prefixo as NomeProvedor, modelo: resto.join(":").trim() }];
      }
      if (item.startsWith("gemini-")) return [{ provedor: "gemini", modelo: item }];
      if (item.startsWith("claude-")) return [{ provedor: "anthropic", modelo: item }];
      return [];
    });
}

/** Lista de modelos de um uso, só com os provedores que têm chave. */
export function alvosDoUso(
  uso: UsoIA,
  env: Record<string, string | undefined> = process.env,
): Alvo[] {
  const { lista, modeloClaudeAntigo } = VARIAVEIS[uso];
  const configurada = lerLista(env[lista] ?? "");
  const alvos = configurada.length
    ? configurada
    : [
        { provedor: "gemini" as const, modelo: PADRAO_GEMINI },
        { provedor: "anthropic" as const, modelo: env[modeloClaudeAntigo] || PADRAO_CLAUDE },
      ];
  const comChave: Record<NomeProvedor, boolean> = {
    gemini: Boolean(env.GEMINI_API_KEY),
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
  };
  return alvos.filter((a) => comChave[a.provedor]);
}

/**
 * Os modelos da lista que vêm depois de `usado` ("gemini:gemini-3.6-flash", ou
 * só o nome do modelo nos registros antigos): a reserva de um lote que falhou.
 */
export function alvosDepoisDe(alvos: Alvo[], usado: string): Alvo[] {
  const igual = (a: Alvo) => `${a.provedor}:${a.modelo}` === usado || a.modelo === usado;
  const posicao = alvos.findIndex(igual);
  return posicao >= 0 ? alvos.slice(posicao + 1) : alvos.filter((a) => !igual(a));
}

const EFFORTS: Esforco[] = ["low", "medium", "high", "xhigh", "max"];

/** Quanto a IA "pensa" antes de responder (mais esforço = mais tokens cobrados). */
export function esforcoDoUso(uso: UsoIA, env: Record<string, string | undefined> = process.env): Esforco {
  if (uso === "chat") return "low";
  const valor = (uso === "correcao" ? env.IA_EFFORT : env.IA_EFFORT_GERACAO) as Esforco;
  return EFFORTS.includes(valor) ? valor : uso === "correcao" ? "low" : "medium";
}

// -----------------------------------------------------------------------------
// Preços (USD por milhão de tokens) para estimar custo no backoffice. Fontes:
// ai.google.dev/gemini-api/docs/pricing e platform.claude.com/docs/en/about-claude/pricing.
// Os Gemini Flash têm preço de lançamento até 31/12/2026 e dobram em 2027.
// -----------------------------------------------------------------------------
type Preco = { entrada: number; saida: number; cache: number };

function precoGeminiFlash(data: Date): Preco {
  return data < new Date("2027-01-01T00:00:00Z")
    ? { entrada: 0.75, saida: 3.75, cache: 0.075 }
    : { entrada: 1.5, saida: 7.5, cache: 0.15 };
}

const PRECOS_CLAUDE: Record<string, Preco> = {
  "claude-opus-5-5": { entrada: 4, saida: 20, cache: 0.2 },
  "claude-sonnet-5-5": { entrada: 2, saida: 10, cache: 0.1 },
  "claude-haiku-5-5": { entrada: 0.1, saida: 0.5, cache: 0.01 },
};

export function precoDoModelo(modelo: string, data: Date = new Date()): Preco | null {
  if (/^gemini-3\.[678]-flash/.test(modelo)) return precoGeminiFlash(data);
  const claude = Object.keys(PRECOS_CLAUDE).find((m) => modelo.startsWith(m));
  return claude ? PRECOS_CLAUDE[claude] : null;
}

/**
 * Custo estimado em dólares. Os tokens de entrada que vieram do cache são
 * cobrados no preço de cache; lotes têm 50% de desconto nos dois provedores.
 */
export function custoEstimado(modelo: string, uso: Uso, opcoes: { lote?: boolean; data?: Date } = {}): number | null {
  const preco = precoDoModelo(modelo, opcoes.data);
  if (!preco) return null;
  const semCache = Math.max(uso.entrada - uso.cache, 0);
  const total = (semCache * preco.entrada + uso.cache * preco.cache + uso.saida * preco.saida) / 1_000_000;
  return opcoes.lote ? total / 2 : total;
}
