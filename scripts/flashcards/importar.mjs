// Importa a planilha de flashcards (colunas ID, Matéria, Módulo, Tópico, Pergunta,
// Resposta, Observação) para as disciplinas que já existem no Supabase.
//
// Para cada matéria:
//   - acha a disciplina pelo slug de scripts/resumos/disciplinas.json (a disciplina
//     precisa existir: rode antes scripts/resumos/importar.mjs);
//   - cria um módulo novo "Flashcards" no fim da disciplina, já publicado;
//   - dentro dele, um item "flashcards" (deck) por módulo da planilha, já publicado;
//   - grava os cards já PUBLICADOS. A fonte guarda o tópico e, quando houver, a
//     observação da planilha ("Conferir: ..."), visível só no admin.
//
// Pode rodar de novo: o módulo é achado pelo título, o deck pelo título e os cards
// cuja pergunta já está no deck são pulados.
//
// Uso:
//   node scripts/flashcards/importar.mjs <planilha.csv> [slug ...] [--simular]
// --simular só lê a planilha e mostra o que seria importado (não precisa do Supabase).
// Variáveis: SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SECRET_KEY.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TITULO_MODULO = "Flashcards";
const LOTE = 500;
const LIMITE_FRENTE = 2000;
const LIMITE_VERSO = 4000;

// Nomes da planilha que diferem do "nome" em disciplinas.json.
const APELIDOS = {
  "Dentística": "dentistica-1",
  "Dentística 2": "dentistica-2",
  "Dentística 3": "dentistica-3",
  "Endodontia": "endodontia-1",
  "Endodontia 2": "endodontia-2",
  "Periodontia 1": "periodontia-1",
  "Periodontia 2": "periodontia-2",
  "Disfunção Temporomandibular (DTM)": "disfuncao-temporomandibular",
  "Pacientes com Necessidades Especiais (PNE)": "pacientes-com-necessidades-especiais",
  "Terapêutica Medicamentosa": "terapia-medicamentosa",
};

const args = process.argv.slice(2);
const simular = args.includes("--simular");
const [planilha, ...filtro] = args.filter((a) => !a.startsWith("--"));
if (!planilha) {
  console.error("Uso: node scripts/flashcards/importar.mjs <planilha.csv> [slug ...] [--simular]");
  process.exit(1);
}

const disciplinas = JSON.parse(readFileSync(join(process.cwd(), "scripts/resumos/disciplinas.json"), "utf8"));
const slugPorNome = new Map(disciplinas.map((d) => [d.nome, d.slug]));
const nomePorSlug = new Map(disciplinas.map((d) => [d.slug, d.nome]));

const limpar = (s) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();

/** Mesma chave de src/lib/flashcards/cards.ts (removerRepetidos). */
const normalizar = (texto) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** CSV com vírgula e aspas (RFC 4180), como o exportado pelo Excel/Sheets. */
function lerCsv(texto) {
  const conteudo = texto.replace(/^﻿/, "");
  const linhas = [];
  let linha = [];
  let celula = "";
  let entreAspas = false;
  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i];
    if (entreAspas) {
      if (c === '"' && conteudo[i + 1] === '"') {
        celula += '"';
        i++;
      } else if (c === '"') entreAspas = false;
      else celula += c;
    } else if (c === '"') entreAspas = true;
    else if (c === ",") {
      linha.push(celula);
      celula = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && conteudo[i + 1] === "\n") i++;
      linha.push(celula);
      linhas.push(linha);
      linha = [];
      celula = "";
    } else celula += c;
  }
  if (celula || linha.length) {
    linha.push(celula);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((c) => c.trim()));
}

/** Agrupa a planilha em disciplina -> deck (módulo da planilha) -> cards, na ordem do arquivo. */
function lerPlanilha(caminho) {
  const [cabecalho, ...linhas] = lerCsv(readFileSync(caminho, "utf8"));
  const coluna = (nome) => {
    const i = cabecalho.findIndex((c) => normalizar(c) === normalizar(nome));
    if (i < 0) throw new Error(`coluna "${nome}" não encontrada na planilha`);
    return i;
  };
  const [iMateria, iModulo, iTopico, iPergunta, iResposta, iObs] = [
    "Matéria", "Módulo", "Tópico", "Pergunta", "Resposta", "Observação",
  ].map(coluna);

  const porSlug = new Map();
  const erros = [];
  const semDisciplina = new Set();
  linhas.forEach((l, i) => {
    const numero = i + 2;
    const materia = limpar(l[iMateria]);
    const slug = APELIDOS[materia] ?? slugPorNome.get(materia);
    if (!slug) return semDisciplina.add(materia);
    const frente = limpar(l[iPergunta]);
    const verso = limpar(l[iResposta]);
    if (!frente || !verso) return erros.push(`linha ${numero}: pergunta ou resposta vazia`);
    if (frente.length > LIMITE_FRENTE || verso.length > LIMITE_VERSO) return erros.push(`linha ${numero}: texto longo demais`);

    const topico = limpar(l[iTopico]);
    const obs = limpar(l[iObs]);
    const fonte = [topico, obs && `Conferir: ${obs}`].filter(Boolean).join(" · ");
    const modulo = limpar(l[iModulo]) || "Geral";

    if (!porSlug.has(slug)) porSlug.set(slug, new Map());
    const decks = porSlug.get(slug);
    if (!decks.has(modulo)) decks.set(modulo, []);
    decks.get(modulo).push({ frente, verso, fonte });
  });
  return { porSlug, erros, semDisciplina };
}

function falhou(contexto, error) {
  if (error) throw new Error(`${contexto}: ${error.message ?? JSON.stringify(error)}`);
}

const tituloDeck = (modulo) => `Flashcards: ${modulo}`;

const { porSlug, erros, semDisciplina } = lerPlanilha(planilha);
erros.forEach((e) => console.warn(`! ${e}`));
if (semDisciplina.size) console.warn(`! matérias sem disciplina em disciplinas.json: ${[...semDisciplina].join(", ")}`);

const alvos = [...porSlug].filter(([slug]) => !filtro.length || filtro.includes(slug));

if (simular) {
  let total = 0;
  for (const [slug, decks] of alvos) {
    const cards = [...decks.values()].reduce((s, c) => s + c.length, 0);
    total += cards;
    console.log(`${nomePorSlug.get(slug)} (${slug}): ${decks.size} decks, ${cards} cards`);
  }
  console.log(`\nTotal: ${alvos.length} disciplinas, ${total} cards.`);
  process.exit(0);
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
if (!url || !chave) {
  console.error("Defina SUPABASE_URL e SUPABASE_SECRET_KEY.");
  process.exit(1);
}
const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

async function garantirModulo(disciplinaId, slug) {
  const { data: modulos, error } = await supabase
    .from("modulos")
    .select("id, titulo, ordem")
    .eq("disciplina_id", disciplinaId)
    .order("ordem");
  falhou(`módulos de ${slug}`, error);
  const existente = modulos.find((m) => m.titulo === TITULO_MODULO);
  if (existente) return existente.id;
  const ordem = (modulos.at(-1)?.ordem ?? 0) + 1;
  const { data, error: e } = await supabase
    .from("modulos")
    .insert({ disciplina_id: disciplinaId, titulo: TITULO_MODULO, ordem, status: "publicado" })
    .select("id")
    .single();
  falhou(`criar módulo de ${slug}`, e);
  return data.id;
}

async function garantirDeck(moduloId, titulo, ordem) {
  const { data: existente, error } = await supabase
    .from("itens")
    .select("id")
    .eq("modulo_id", moduloId)
    .eq("tipo", "flashcards")
    .eq("titulo", titulo)
    .maybeSingle();
  falhou(`buscar deck ${titulo}`, error);
  if (existente) return existente.id;
  const { data, error: e } = await supabase
    .from("itens")
    .insert({ modulo_id: moduloId, tipo: "flashcards", titulo, ordem, status: "publicado" })
    .select("id")
    .single();
  falhou(`criar deck ${titulo}`, e);
  return data.id;
}

async function importarCards(itemId, cards) {
  const { data: atuais, error } = await supabase.from("flashcards").select("frente, ordem").eq("item_id", itemId);
  falhou("ler cards do deck", error);
  const vistas = new Set(atuais.map((c) => normalizar(c.frente)));
  let ordem = atuais.reduce((max, c) => Math.max(max, c.ordem), 0);
  const novos = [];
  for (const card of cards) {
    const chaveCard = normalizar(card.frente);
    if (vistas.has(chaveCard)) continue;
    vistas.add(chaveCard);
    novos.push({ ...card, item_id: itemId, ordem: ++ordem, origem: "professor", status: "publicado" });
  }
  for (let i = 0; i < novos.length; i += LOTE) {
    const { error: e } = await supabase.from("flashcards").insert(novos.slice(i, i + LOTE));
    falhou("gravar cards", e);
  }
  return { novos: novos.length, pulados: cards.length - novos.length };
}

let totalNovos = 0;
let totalPulados = 0;
for (const [slug, decks] of alvos) {
  const { data: disciplina, error } = await supabase.from("disciplinas").select("id").eq("slug", slug).maybeSingle();
  falhou(`buscar ${slug}`, error);
  if (!disciplina) {
    console.warn(`! ${slug}: disciplina não existe no banco (rode scripts/resumos/importar.mjs antes). Pulada.`);
    continue;
  }
  const moduloId = await garantirModulo(disciplina.id, slug);
  let novos = 0;
  let pulados = 0;
  for (const [i, [modulo, cards]] of [...decks].entries()) {
    const itemId = await garantirDeck(moduloId, tituloDeck(modulo), i + 1);
    const r = await importarCards(itemId, cards);
    novos += r.novos;
    pulados += r.pulados;
  }
  totalNovos += novos;
  totalPulados += pulados;
  console.log(`✓ ${slug}: ${decks.size} decks, ${novos} cards novos${pulados ? `, ${pulados} já existiam/repetidos` : ""}`);
}
console.log(`\nPronto: ${totalNovos} cards novos, ${totalPulados} pulados.`);
