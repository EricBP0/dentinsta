// Converte os SVGs da marca em PNG (perfil do Instagram, WhatsApp, certificado).
// Rode depois de scripts/marca/gerar.py. Precisa do Playwright com Chromium; se
// ele não estiver no projeto, use PLAYWRIGHT_MODULE=/caminho/playwright/index.mjs.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const saidas = [
  { svg: "public/marca/odontolab-perfil.svg", png: "public/marca/odontolab-perfil-1024.png", lado: 1024, transparente: true },
  { svg: "public/marca/odontolab-selo.svg", png: "public/marca/odontolab-simbolo-512.png", lado: 512, transparente: true },
  { svg: "public/marca/odontolab-selo.svg", png: "assets/marca/selo-512.png", lado: 512, transparente: true },
];

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const navegador = await chromium.launch();
for (const s of saidas) {
  const pagina = await navegador.newPage({ viewport: { width: s.lado, height: s.lado } });
  const conteudo = readFileSync(join(raiz, s.svg), "utf8").replace(/width="\d+" height="\d+"/, `width="${s.lado}" height="${s.lado}"`);
  await pagina.setContent(`<html><body style="margin:0;background:transparent">${conteudo}</body></html>`);
  await pagina.screenshot({ path: join(raiz, s.png), omitBackground: s.transparente });
  await pagina.close();
  console.log(s.png);
}
await navegador.close();
