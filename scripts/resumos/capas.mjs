// Gera as capas das disciplinas (public/capas/<slug>.png) na identidade visual
// da marca: fundo violeta quadriculado, selo verde-limão no estilo da tabela
// periódica, etiqueta "LAB" e a marca pequena no rodapé.
//
// Uso:
//   node scripts/resumos/capas.mjs                 # todas
//   node scripts/resumos/capas.mjs cirurgia sus    # só algumas (por slug)
//
// Precisa do Playwright com Chromium. Se ele não estiver instalado no projeto,
// aponte para outra instalação com PLAYWRIGHT_MODULE=/caminho/playwright/index.mjs.
// Lê o número de módulos e páginas de .resumos/<slug>/resumo.json, quando o
// conversor já tiver rodado.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const disciplinas = JSON.parse(readFileSync(join(raiz, "scripts/resumos/disciplinas.json"), "utf8"));
const filtro = process.argv.slice(2);
const destino = join(raiz, "public/capas");
mkdirSync(destino, { recursive: true });

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 800 } });

const escapar = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function estatisticas(slug) {
  const arquivo = join(raiz, ".resumos", slug, "resumo.json");
  if (!existsSync(arquivo)) return null;
  const resumo = JSON.parse(readFileSync(arquivo, "utf8"));
  return { modulos: resumo.modulos.length, paginas: resumo.paginas };
}

function html(d, numero) {
  const stats = estatisticas(d.slug);
  const linha = stats
    ? `${stats.modulos} ${stats.modulos === 1 ? "módulo" : "módulos"} · ${stats.paginas} páginas de resumo`
    : "Resumo de estudo";
  // Nomes longos ganham fonte menor para caber em até 3 linhas.
  const tamanho = d.nome.length > 28 ? 72 : d.nome.length > 16 ? 88 : 104;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800&family=JetBrains+Mono:wght@500;700&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 800px; overflow: hidden; background: #5A3FE0; color: #fff; font-family: "Plus Jakarta Sans", sans-serif; font-weight: 500;
    background-image: linear-gradient(rgba(255,255,255,.09) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,255,255,.09) 1.5px, transparent 1.5px);
    background-size: 80px 80px; background-position: -1px -1px; }
  .mono { font-family: "JetBrains Mono", monospace; text-transform: uppercase; letter-spacing: .14em; }
  .topo { position: absolute; top: 64px; left: 72px; right: 72px; display: flex; justify-content: space-between; align-items: center; font-size: 22px; font-weight: 500; }
  .pilula { background: #12101F; color: #C8F250; border-radius: 10px; padding: 10px 16px; font-weight: 700; }
  .selo { position: absolute; top: 148px; left: 72px; width: 216px; height: 216px; background: #C8F250; color: #12101F;
    border-radius: 24px; padding: 22px 24px; display: flex; flex-direction: column; justify-content: space-between; }
  .selo .num { font-size: 26px; font-weight: 500; letter-spacing: .04em; }
  .selo .sim { font-weight: 800; font-size: 100px; line-height: .8; letter-spacing: -.04em; }
  .selo .sim sup { font-family: "JetBrains Mono", monospace; font-size: 30px; font-weight: 700; letter-spacing: 0; vertical-align: top; margin-left: 6px; }
  .selo .rot { font-size: 15px; font-weight: 700; letter-spacing: .08em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .texto { position: absolute; left: 72px; right: 72px; top: 400px; }
  .titulo { font-weight: 800; font-size: ${tamanho}px; line-height: 1; letter-spacing: -.035em; }
  .sub { margin-top: 22px; font-size: 30px; color: rgba(255,255,255,.88); }
  .rodape { position: absolute; left: 72px; right: 72px; bottom: 44px; display: flex; justify-content: space-between; align-items: center; }
  .marca { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 32px; letter-spacing: -.03em; }
  .marca span { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 20px; letter-spacing: .1em; background: #C8F250; color: #12101F; border-radius: 7px; padding: 4px 9px; }
  .rodape .mono { font-size: 18px; color: rgba(255,255,255,.88); }
</style></head><body>
  <div class="topo mono"><span class="pilula">Lab ${String(numero).padStart(2, "0")}</span><span>${escapar(d.area)}</span></div>
  <div class="selo">
    <div class="num mono">${String(numero).padStart(2, "0")}</div>
    <div class="sim">${escapar(d.sigla)}${d.indice ? `<sup>${escapar(d.indice)}</sup>` : ""}</div>
    <div class="rot mono">${escapar(d.rotulo ?? d.nome)}</div>
  </div>
  <div class="texto"><div class="titulo">${escapar(d.nome)}</div><div class="sub">${escapar(linha)}</div></div>
  <div class="rodape"><div class="marca">odonto<span>LAB</span></div><div class="mono">Resumo de bolso</div></div>
</body></html>`;
}

let geradas = 0;
for (const [i, d] of disciplinas.entries()) {
  if (filtro.length && !filtro.includes(d.slug)) continue;
  await pagina.setContent(html(d, i + 1), { waitUntil: "networkidle" });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.screenshot({ path: join(destino, `${d.slug}.png`) });
  geradas++;
}
await navegador.close();
console.log(`${geradas} capa(s) em public/capas/`);
