// Importa a base de questões gerada a partir dos resumos (uma pasta de JSONs por
// disciplina: <slug>-01.json, <slug>-02.json, ...).
//
// Para cada disciplina cria um registro em geracoes_questoes (status "concluida",
// para aparecer no histórico de gerações do admin) e grava as questões como
// RASCUNHO, origem "ia", com a fonte no resumo. Nada vai para os simulados antes
// da revisão do professor.
//
// Pode rodar de novo: a disciplina que já tem a geração "base-resumos" é pulada.
//
// Uso:
//   node scripts/questoes/importar-base.mjs <pasta-dos-json> [slug ...]
// Variáveis: SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SECRET_KEY.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const MARCA_LOTE = "base-resumos";
const LETRAS = ["A", "B", "C", "D", "E"];

const [pasta, ...filtro] = process.argv.slice(2);
if (!pasta) {
  console.error("Uso: node scripts/questoes/importar-base.mjs <pasta-dos-json> [slug ...]");
  process.exit(1);
}
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
if (!url || !chave) {
  console.error("Defina SUPABASE_URL e SUPABASE_SECRET_KEY.");
  process.exit(1);
}
const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
const disciplinas = JSON.parse(readFileSync(join(process.cwd(), "scripts/resumos/disciplinas.json"), "utf8"));

const limpar = (s) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();

/** Mesmas regras de src/lib/questoes/questao.ts (validarQuestao). Devolve a linha do banco ou o erro. */
function paraLinha(q) {
  const tipo = q.tipo;
  const enunciado = limpar(q.enunciado);
  const dificuldade = Number(q.dificuldade);
  if (tipo !== "objetiva" && tipo !== "discursiva") return { erro: `tipo inválido: ${tipo}` };
  if (!enunciado) return { erro: "enunciado vazio" };
  if (![1, 2, 3].includes(dificuldade)) return { erro: `dificuldade inválida: ${q.dificuldade}` };

  let alternativas = [];
  let gabarito = limpar(q.gabarito);
  let rubrica = [];
  if (tipo === "objetiva") {
    alternativas = (q.alternativas ?? [])
      .map((texto, i) => ({ letra: LETRAS[i], texto: limpar(texto).replace(/^[A-Ea-e][).:-]\s+/, "") }))
      .filter((a) => a.letra && a.texto);
    gabarito = gabarito.toUpperCase().replace(/[).]$/, "");
    if (alternativas.length < 2) return { erro: "objetiva com menos de 2 alternativas" };
    if (!alternativas.some((a) => a.letra === gabarito)) return { erro: `gabarito "${gabarito}" sem alternativa` };
  } else {
    rubrica = (q.rubrica ?? [])
      .map((c) => ({ criterio: limpar(c.criterio), pontos: Number(c.pontos) }))
      .filter((c) => c.criterio && c.pontos > 0);
    if (!gabarito && !rubrica.length) return { erro: "discursiva sem gabarito nem rubrica" };
  }
  return {
    linha: {
      tipo,
      tema: limpar(q.tema),
      enunciado,
      alternativas,
      gabarito,
      explicacao: limpar(q.explicacao),
      rubrica,
      dificuldade,
      estilo: "",
      fonte: limpar(q.fonte).slice(0, 300),
      origem: "ia",
      status: "rascunho",
    },
  };
}

const arquivos = readdirSync(pasta).filter((f) => f.endsWith(".json"));
let total = 0;

for (const d of disciplinas) {
  if (filtro.length && !filtro.includes(d.slug)) continue;
  const meus = arquivos.filter((f) => new RegExp(`^${d.slug}-\\d+\\.json$`).test(f)).sort();
  if (!meus.length) {
    console.warn(`- ${d.slug}: nenhum arquivo`);
    continue;
  }

  const { data: disciplina, error: e1 } = await supabase.from("disciplinas").select("id").eq("slug", d.slug).single();
  if (e1) throw new Error(`${d.slug}: ${e1.message}`);
  const { data: anterior } = await supabase
    .from("geracoes_questoes")
    .select("id")
    .eq("disciplina_id", disciplina.id)
    .eq("config->>lote", MARCA_LOTE)
    .maybeSingle();
  if (anterior) {
    console.log(`= ${d.slug}: já importada, pulando`);
    continue;
  }

  const linhas = [];
  const descartadas = [];
  for (const f of meus) {
    for (const q of JSON.parse(readFileSync(join(pasta, f), "utf8"))) {
      const r = paraLinha(q);
      if ("erro" in r) descartadas.push(`${f}: ${r.erro}`);
      else linhas.push(r.linha);
    }
  }
  const objetivas = linhas.filter((l) => l.tipo === "objetiva").length;

  const { data: geracao, error: e2 } = await supabase
    .from("geracoes_questoes")
    .insert({
      disciplina_id: disciplina.id,
      texto: `Resumo de ${d.nome} (scripts/resumos)`,
      tipo_material: "conteudo",
      config: {
        lote: MARCA_LOTE,
        objetivas,
        discursivas: linhas.length - objetivas,
        dificuldade: null,
        tema: "",
        instrucoes: "Base inicial gerada a partir dos resumos da disciplina.",
      },
      status: "concluida",
      modelo: "claude (sessão de importação)",
      observacoes: descartadas.length ? `Descartadas: ${descartadas.join("; ")}` : null,
      questoes_geradas: linhas.length,
      questoes_descartadas: descartadas.length,
      concluido_em: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (e2) throw new Error(`${d.slug}: ${e2.message}`);

  for (let i = 0; i < linhas.length; i += 100) {
    const lote = linhas.slice(i, i + 100).map((l) => ({ ...l, disciplina_id: disciplina.id, geracao_id: geracao.id }));
    const { error } = await supabase.from("questoes").insert(lote);
    if (error) throw new Error(`${d.slug}: ${error.message}`);
  }
  total += linhas.length;
  console.log(`✓ ${d.slug}: ${linhas.length} questões (${objetivas} objetivas)${descartadas.length ? `, ${descartadas.length} descartadas` : ""}`);
}
console.log(`Pronto: ${total} questões importadas como rascunho. Revise em /admin/questoes.`);
