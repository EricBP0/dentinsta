// Converte os SVGs da marca em PNG (perfil do Instagram, e-mails, certificado, ícones).
// Rode depois de scripts/marca/gerar.py. Precisa do Playwright com Chromium; se
// ele não estiver no projeto, use PLAYWRIGHT_MODULE=/caminho/playwright/index.mjs.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const saidas = [
  { svg: "public/marca/odontolab-perfil.svg", png: "public/marca/odontolab-perfil-1080.png", lado: 1080 },
  { svg: "public/marca/odontolab-icone.svg", png: "public/marca/odontolab-icone-512.png", lado: 512 },
  // Nome antigo mantido: os e-mails já configurados no Supabase apontam para ele.
  { svg: "public/marca/odontolab-icone-violeta.svg", png: "public/marca/odontolab-simbolo-512.png", lado: 512 },
  { svg: "public/marca/odontolab-icone.svg", png: "assets/marca/icone-512.png", lado: 512 },
  { svg: "public/marca/odontolab-icone-violeta.svg", png: "assets/marca/icone-violeta-512.png", lado: 512 },
];

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const navegador = await chromium.launch();
for (const s of saidas) {
  const pagina = await navegador.newPage({ viewport: { width: s.lado, height: s.lado } });
  const conteudo = readFileSync(join(raiz, s.svg), "utf8").replace(/width="\d+" height="\d+"/, `width="${s.lado}" height="${s.lado}"`);
  await pagina.setContent(`<html><body style="margin:0;background:transparent">${conteudo}</body></html>`);
  await pagina.screenshot({ path: join(raiz, s.png), omitBackground: true });
  await pagina.close();
  console.log(s.png);
}
await navegador.close();
