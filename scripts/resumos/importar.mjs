// Importa os resumos convertidos para o Supabase.
//
// Para cada PDF de scripts/resumos/disciplinas.json:
//   - cria a disciplina (em RASCUNHO, com a capa de public/capas/), se ainda não existir;
//   - sobe o PDF e as figuras para o bucket privado "resumos";
//   - cria um módulo por capa interna do PDF, com um item "resumo" (obrigatório) que
//     guarda o texto estruturado e aponta para a página do módulo no PDF.
//
// Pode rodar de novo: acha disciplina pelo slug, módulo/item pela ordem, e só
// atualiza. Não mexe no status de quem já existe nem nos campos que a equipe editou.
//
// Uso:
//   python3 scripts/resumos/converter.py <pasta-dos-pdfs>   # gera .resumos/
//   node scripts/resumos/importar.mjs <pasta-dos-pdfs> [slug ...] [--forcar-midia]
//
// Variáveis: SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SECRET_KEY.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "resumos";
const PARALELO = 6;

const args = process.argv.slice(2);
const forcarMidia = args.includes("--forcar-midia");
const [pastaPdfs, ...filtro] = args.filter((a) => !a.startsWith("--"));
if (!pastaPdfs) {
  console.error("Uso: node scripts/resumos/importar.mjs <pasta-dos-pdfs> [slug ...] [--forcar-midia]");
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
if (!url || !chave) {
  console.error("Defina SUPABASE_URL e SUPABASE_SECRET_KEY.");
  process.exit(1);
}
const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

const raiz = process.cwd();
const disciplinas = JSON.parse(readFileSync(join(raiz, "scripts/resumos/disciplinas.json"), "utf8"));

function falhou(contexto, error) {
  if (error) throw new Error(`${contexto}: ${error.message ?? JSON.stringify(error)}`);
}

/** Descrição curta a partir dos módulos (ou das seções, se só houver um). */
function descricao(resumo) {
  const nomes =
    resumo.modulos.length > 1
      ? resumo.modulos.map((m) => m.titulo)
      : resumo.modulos[0].secoes.map((s) => s.titulo).filter(Boolean);
  let texto = "";
  for (const nome of nomes) {
    const proximo = texto ? `${texto}, ${nome}` : nome;
    if (proximo.length > 220) return `${texto} e mais.`;
    texto = proximo;
  }
  return `${texto}.`;
}

/** Troca "img/0001.webp" pelo caminho completo no bucket. */
function prefixarFiguras(blocos, slug) {
  return blocos.map((b) => {
    if (b.t === "img") return { ...b, src: `${slug}/${b.src}` };
    if (b.t === "caixa") return { ...b, blocos: prefixarFiguras(b.blocos, slug) };
    return b;
  });
}

async function emLotes(lista, fn) {
  for (let i = 0; i < lista.length; i += PARALELO) {
    await Promise.all(lista.slice(i, i + PARALELO).map(fn));
  }
}

async function arquivosNoBucket(pasta) {
  const nomes = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list(pasta, { limit: 1000, offset });
    falhou(`listar ${pasta}`, error);
    data.forEach((a) => nomes.add(a.name));
    if (data.length < 1000) return nomes;
  }
}

async function enviar(caminho, conteudo, tipo) {
  for (let tentativa = 1; ; tentativa++) {
    const { error } = await supabase.storage.from(BUCKET).upload(caminho, conteudo, { contentType: tipo, upsert: true });
    if (!error) return;
    if (tentativa >= 3) falhou(`enviar ${caminho}`, error);
    await new Promise((r) => setTimeout(r, 2000 * tentativa));
  }
}

async function subirMidia(d, pastaResumo) {
  const pdf = `${d.slug}/${d.slug}.pdf`;
  const existentes = forcarMidia ? new Set() : await arquivosNoBucket(d.slug);
  const existentesImg = forcarMidia ? new Set() : await arquivosNoBucket(`${d.slug}/img`);

  if (!existentes.has(`${d.slug}.pdf`)) {
    await enviar(pdf, readFileSync(join(pastaPdfs, d.arquivo)), "application/pdf");
  }
  const figuras = readdirSync(join(pastaResumo, "img")).filter((f) => f.endsWith(".webp") && !existentesImg.has(f));
  await emLotes(figuras, (f) => enviar(`${d.slug}/img/${f}`, readFileSync(join(pastaResumo, "img", f)), "image/webp"));
  return { pdf, enviadas: figuras.length };
}

async function garantirDisciplina(d, resumo, ordem) {
  const { data: existente, error } = await supabase.from("disciplinas").select("id, capa_url, descricao").eq("slug", d.slug).maybeSingle();
  falhou(`buscar ${d.slug}`, error);
  const capa = existsSync(join(raiz, "public/capas", `${d.slug}.png`)) ? `/capas/${d.slug}.png` : null;

  if (existente) {
    // Só preenche o que estiver vazio: o que a equipe editou fica.
    const mudancas = {};
    if (!existente.capa_url && capa) mudancas.capa_url = capa;
    if (!existente.descricao) mudancas.descricao = descricao(resumo);
    if (Object.keys(mudancas).length) {
      const { error: e } = await supabase.from("disciplinas").update(mudancas).eq("id", existente.id);
      falhou(`atualizar ${d.slug}`, e);
    }
    return existente.id;
  }

  const { data, error: e } = await supabase
    .from("disciplinas")
    .insert({ slug: d.slug, nome: d.nome, descricao: descricao(resumo), capa_url: capa, status: "rascunho", ordem })
    .select("id")
    .single();
  falhou(`criar ${d.slug}`, e);
  return data.id;
}

async function sincronizarModulos(disciplinaId, d, resumo, pdf) {
  const { data: modulos, error } = await supabase
    .from("modulos")
    .select("id, ordem, itens(id, tipo, ordem)")
    .eq("disciplina_id", disciplinaId)
    .order("ordem");
  falhou(`módulos de ${d.slug}`, error);

  for (const [i, m] of resumo.modulos.entries()) {
    const ordem = i + 1;
    let modulo = modulos.find((x) => x.ordem === ordem);
    if (!modulo) {
      const { data, error: e } = await supabase
        .from("modulos")
        .insert({ disciplina_id: disciplinaId, titulo: m.titulo, ordem, status: "publicado" })
        .select("id, ordem")
        .single();
      falhou(`criar módulo ${m.titulo}`, e);
      modulo = { ...data, itens: [] };
    }

    const config = {
      resumo: { secoes: m.secoes.map((s) => ({ ...s, blocos: prefixarFiguras(s.blocos, d.slug) })) },
      pdf_caminho: pdf,
      pdf_pagina: m.pagina,
    };
    const item = modulo.itens.find((x) => x.tipo === "resumo");
    if (item) {
      // Mantém título/status do item; troca só o conteúdo importado.
      const { data: atual } = await supabase.from("itens").select("config").eq("id", item.id).single();
      const { error: e } = await supabase
        .from("itens")
        .update({ config: { ...(atual?.config ?? {}), ...config } })
        .eq("id", item.id);
      falhou(`atualizar item ${m.titulo}`, e);
    } else {
      const { error: e } = await supabase.from("itens").insert({
        modulo_id: modulo.id,
        tipo: "resumo",
        titulo: `Resumo: ${m.titulo}`,
        ordem: 1,
        obrigatorio: true,
        status: "publicado",
        config,
      });
      falhou(`criar item ${m.titulo}`, e);
    }
  }
}

const { data: ultima } = await supabase.from("disciplinas").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
let ordem = ultima?.ordem ?? 0;

for (const d of disciplinas) {
  if (filtro.length && !filtro.includes(d.slug)) continue;
  const pastaResumo = join(raiz, ".resumos", d.slug);
  if (!existsSync(join(pastaResumo, "resumo.json"))) {
    console.warn(`- ${d.slug}: sem .resumos/${d.slug}/resumo.json (rode o converter.py antes)`);
    continue;
  }
  const resumo = JSON.parse(readFileSync(join(pastaResumo, "resumo.json"), "utf8"));
  const inicio = Date.now();
  const { pdf, enviadas } = await subirMidia(d, pastaResumo);
  const disciplinaId = await garantirDisciplina(d, resumo, ++ordem);
  await sincronizarModulos(disciplinaId, d, resumo, pdf);
  console.log(
    `✓ ${d.slug}: ${resumo.modulos.length} módulos, ${enviadas} figuras enviadas (${Math.round((Date.now() - inicio) / 1000)}s)`,
  );
}
console.log("Pronto. As disciplinas novas ficam em rascunho: revise no /admin e publique.");
