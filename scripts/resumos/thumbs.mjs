// Gera as thumbs verticais (3:4) das disciplinas em public/thumbs/<slug>.jpg:
// uma arte única por disciplina (paleta e ilustração próprias), com o nome no
// topo e a marca no rodapé. Cada conteúdo da disciplina usa essa arte no
// catálogo do aluno, com o título do conteúdo por cima (ver thumb-conteudo.tsx).
//
// Uso:
//   node scripts/resumos/thumbs.mjs                 # todas
//   node scripts/resumos/thumbs.mjs cirurgia sus    # só algumas (por slug)
//
// Precisa do Playwright com Chromium. Se ele não estiver instalado no projeto,
// aponte para outra instalação com PLAYWRIGHT_MODULE=/caminho/playwright/index.mjs.
// No fim atualiza src/lib/thumbs.json com os slugs que têm thumb.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const disciplinas = JSON.parse(readFileSync(join(raiz, "scripts/resumos/disciplinas.json"), "utf8"));
const filtro = process.argv.slice(2);
const destino = join(raiz, "public/thumbs");
mkdirSync(destino, { recursive: true });

const escapar = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------------------------------------------------------------------------
// Peças de desenho (SVG num quadro de 400x400)
// ---------------------------------------------------------------------------

const MOLAR =
  "M10,34 C8,10 24,2 34,8 C41,12 45,13 50,9 C55,13 59,12 66,8 C76,2 92,10 90,34 C89,50 86,58 84,66 C82,82 80,98 76,118 C74,128 66,128 64,118 L58,88 C56,80 44,80 42,88 L36,118 C34,128 26,128 24,118 C20,98 18,82 16,66 C14,58 11,50 10,34 Z";
const INCISIVO =
  "M28,12 C40,4 60,4 72,12 C78,32 76,50 70,62 C66,88 60,114 54,126 C51,132 49,132 46,126 C40,114 34,88 30,62 C24,50 22,32 28,12 Z";
const CANINO =
  "M30,20 C38,8 46,2 50,2 C54,2 62,8 70,20 C78,36 74,52 68,64 C64,90 58,118 53,130 C51,135 49,135 47,130 C42,118 36,90 32,64 C26,52 22,36 30,20 Z";

/** Dente com brilho. forma: MOLAR | INCISIVO | CANINO (caixa 100x135). */
function dente(forma, x, y, escala = 1, extra = "") {
  return `<g transform="translate(${x},${y}) scale(${escala})" ${extra}>
    <path d="${forma}" fill="url(#esmalte)" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
    <path d="${forma}" fill="none" stroke="#fff" stroke-width="3" opacity=".55" transform="translate(-2,-2)" clip-path="url(#nada)"/>
    <ellipse cx="34" cy="26" rx="10" ry="6" fill="#fff" opacity=".8" transform="rotate(-25 34 26)"/>
  </g>`;
}

/** Coroa de um dente visto de frente (para arcadas). */
function coroa(x, y, l, a, raio = 14) {
  return `<rect x="${x}" y="${y}" width="${l}" height="${a}" rx="${raio}" fill="url(#esmalte)" stroke="rgba(0,0,0,.15)" stroke-width="2"/>
    <rect x="${x + l * 0.2}" y="${y + a * 0.12}" width="${l * 0.22}" height="${a * 0.35}" rx="${l * 0.11}" fill="#fff" opacity=".7"/>`;
}

/** Arcada vista de frente: gengiva + fileira de coroas. */
function arcada(y, superior = true, cor = "#ff8fb1", n = 6) {
  const larguras = [34, 40, 46, 52, 52, 46, 40, 34].slice(4 - n / 2, 4 + n / 2);
  const total = larguras.reduce((s, l) => s + l + 4, 0);
  let x = 200 - total / 2;
  const dentes = larguras
    .map((l, i) => {
      const meio = Math.abs(i - (n - 1) / 2);
      const a = 70 - meio * 7;
      const yy = superior ? y : y - a;
      const r = coroa(x, yy, l, a, 16);
      x += l + 4;
      return r;
    })
    .join("");
  const gengiva = superior
    ? `<path d="M${200 - total / 2 - 26},${y - 40} Q200,${y - 70} ${200 + total / 2 + 26},${y - 40} L${200 + total / 2 + 14},${y + 20} Q200,${y - 6} ${200 - total / 2 - 14},${y + 20} Z" fill="${cor}"/>`
    : `<path d="M${200 - total / 2 - 26},${y + 40} Q200,${y + 70} ${200 + total / 2 + 26},${y + 40} L${200 + total / 2 + 14},${y - 20} Q200,${y + 6} ${200 - total / 2 - 14},${y - 20} Z" fill="${cor}"/>`;
  return gengiva + dentes;
}

function capsula(x, y, l, a, ang, c1, c2) {
  return `<g transform="translate(${x},${y}) rotate(${ang})">
    <rect x="${-l / 2}" y="${-a / 2}" width="${l}" height="${a}" rx="${a / 2}" fill="${c2}"/>
    <path d="M0,${-a / 2} H${l / 2 - a / 2} A${a / 2},${a / 2} 0 0 1 ${l / 2 - a / 2},${a / 2} H0 Z" fill="${c1}"/>
    <rect x="${-l / 2 + 8}" y="${-a / 2 + 6}" width="${l * 0.35}" height="${a * 0.18}" rx="${a * 0.09}" fill="#fff" opacity=".6"/>
  </g>`;
}

function pessoa(x, y, s, cor) {
  return `<g transform="translate(${x},${y}) scale(${s})">
    <circle cx="0" cy="-58" r="24" fill="${cor}"/>
    <path d="M-40,40 C-40,-6 -24,-28 0,-28 C24,-28 40,-6 40,40 Z" fill="${cor}"/>
  </g>`;
}

const estrela = (x, y, r, cor, op = 1) =>
  `<path transform="translate(${x},${y}) scale(${r / 10})" d="M0,-10 L2.6,-2.6 L10,0 L2.6,2.6 L0,10 L-2.6,2.6 L-10,0 L-2.6,-2.6 Z" fill="${cor}" opacity="${op}"/>`;

// ---------------------------------------------------------------------------
// Ilustração de cada disciplina. a = cor clara de destaque, b = cor média.
// ---------------------------------------------------------------------------

const ARTES = {
  "anatomia-geral": ({ a }) => `
    <g transform="rotate(-35 200 200)">
      <rect x="182" y="70" width="36" height="260" rx="18" fill="url(#osso)"/>
      <circle cx="176" cy="74" r="30" fill="url(#osso)"/><circle cx="224" cy="74" r="30" fill="url(#osso)"/>
      <circle cx="176" cy="326" r="30" fill="url(#osso)"/><circle cx="224" cy="326" r="30" fill="url(#osso)"/>
      <rect x="192" y="110" width="8" height="180" rx="4" fill="#fff" opacity=".6"/>
    </g>
    <g transform="rotate(35 200 200)" opacity=".85">
      <rect x="188" y="96" width="24" height="208" rx="12" fill="${a}"/>
      <circle cx="184" cy="100" r="20" fill="${a}"/><circle cx="216" cy="100" r="20" fill="${a}"/>
      <circle cx="184" cy="300" r="20" fill="${a}"/><circle cx="216" cy="300" r="20" fill="${a}"/>
    </g>`,

  "anatomia-dental": ({ a }) => `
    <g stroke="${a}" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round" opacity=".9">
      <path d="M248,120 L330,92"/><path d="M262,220 L338,236"/><path d="M150,300 L72,322"/>
    </g>
    <circle cx="334" cy="90" r="9" fill="${a}"/><circle cx="342" cy="238" r="9" fill="${a}"/><circle cx="68" cy="324" r="9" fill="${a}"/>
    ${dente(MOLAR, 105, 70, 1.9)}`,

  "anatomia-de-cabeca-e-pescoco": ({ a }) => `
    <path d="M200,40 C110,40 70,104 74,176 C76,214 92,236 110,252 L114,300 C114,318 128,328 146,328 L254,328 C272,328 286,318 286,300 L290,252 C308,236 324,214 326,176 C330,104 290,40 200,40 Z" fill="url(#osso)"/>
    <path d="M150,62 C118,80 104,112 104,150" stroke="#fff" stroke-width="8" fill="none" opacity=".55" stroke-linecap="round"/>
    <ellipse cx="152" cy="190" rx="34" ry="30" fill="#1b1033" opacity=".85"/>
    <ellipse cx="248" cy="190" rx="34" ry="30" fill="#1b1033" opacity=".85"/>
    <path d="M200,214 L184,254 L216,254 Z" fill="#1b1033" opacity=".85"/>
    <g fill="#fff" stroke="rgba(0,0,0,.2)" stroke-width="1.5">
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${143 + i * 19}" y="280" width="16" height="30" rx="5"/>`).join("")}
    </g>
    <circle cx="152" cy="190" r="8" fill="${a}"/><circle cx="248" cy="190" r="8" fill="${a}"/>`,

  histologia: ({ a, b }) => {
    const celulas = [];
    for (let l = 0; l < 6; l++)
      for (let c = 0; c < 6; c++) {
        const x = 52 + c * 62 + (l % 2) * 31;
        const y = 70 + l * 54;
        const d = Math.hypot(x - 200, y - 200);
        if (d > 175) continue;
        celulas.push(`<g transform="translate(${x},${y})" opacity="${1 - d / 260}">
          <path d="M-30,0 L-15,-27 L15,-27 L30,0 L15,27 L-15,27 Z" fill="${a}" fill-opacity=".9" stroke="${b}" stroke-width="3"/>
          <circle r="10" fill="${b}"/><circle r="4" cx="-3" cy="-3" fill="#fff" opacity=".7"/></g>`);
      }
    return `${celulas.join("")}<circle cx="200" cy="200" r="72" fill="none" stroke="#fff" stroke-width="10" opacity=".9"/>
      <path d="M252,252 L320,320" stroke="#fff" stroke-width="22" stroke-linecap="round"/>`;
  },

  fisiologia: ({ a }) => `
    <path d="M200,330 C130,280 70,230 70,160 C70,112 106,80 146,80 C172,80 190,94 200,112 C210,94 228,80 254,80 C294,80 330,112 330,160 C330,230 270,280 200,330 Z" fill="${a}"/>
    <path d="M120,120 C108,130 102,146 102,160" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".7"/>
    <path d="M30,200 L130,200 L152,150 L184,262 L214,120 L240,226 L258,200 L370,200" fill="none" stroke="#fff" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>`,

  bioquimica: ({ a, b }) => {
    const hex = (x, y, r) =>
      `<path transform="translate(${x},${y})" d="M0,${-r} L${r * 0.866},${-r / 2} L${r * 0.866},${r / 2} L0,${r} L${-r * 0.866},${r / 2} L${-r * 0.866},${-r / 2} Z" fill="none" stroke="${a}" stroke-width="10" stroke-linejoin="round"/>`;
    return `${hex(150, 170, 62)}${hex(257, 170, 62)}
      <path d="M150,124 L150,216" stroke="${a}" stroke-width="6" opacity=".6" transform="translate(-30,0)"/>
      <path d="M257,108 L257,40 M150,232 L150,300 M311,201 L360,232" stroke="${a}" stroke-width="10" stroke-linecap="round"/>
      <circle cx="257" cy="34" r="20" fill="#fff"/><circle cx="150" cy="310" r="24" fill="${b}" stroke="#fff" stroke-width="6"/>
      <circle cx="366" cy="236" r="18" fill="#fff"/>
      <text x="150" y="318" font-family="Plus Jakarta Sans" font-weight="800" font-size="24" fill="#fff" text-anchor="middle">O</text>`;
  },

  farmacologia: ({ a, b }) => `
    ${capsula(150, 150, 170, 64, -35, "#fff", a)}
    ${capsula(256, 236, 150, 56, 25, a, b)}
    <circle cx="120" cy="290" r="38" fill="#fff"/><path d="M90,290 H150" stroke="${b}" stroke-width="6"/>
    <circle cx="300" cy="110" r="28" fill="${a}"/><path d="M278,110 H322" stroke="#fff" stroke-width="5" opacity=".8"/>`,

  cariologia: ({ a, b }) => `
    ${dente(MOLAR, 110, 66, 1.8)}
    <path d="M150,100 C140,120 150,136 170,134 C186,132 192,116 182,104 C174,96 158,92 150,100 Z" fill="#3a2008" opacity=".85"/>
    <path d="M232,150 C226,162 234,172 246,170 C256,168 258,156 252,150 C246,144 236,144 232,150 Z" fill="#3a2008" opacity=".7"/>
    ${[[70, 110], [330, 140], [320, 290], [80, 280], [300, 60]]
      .map(([x, y], i) => `<g transform="translate(${x},${y}) rotate(${i * 40})"><rect x="-22" y="-10" width="44" height="20" rx="10" fill="${a}"/><circle cx="-8" cy="0" r="3" fill="${b}"/><circle cx="6" cy="0" r="3" fill="${b}"/></g>`)
      .join("")}`,

  "dentistica-1": ({ a }) => `
    ${dente(INCISIVO, 120, 60, 1.9)}
    <path d="M178,100 C190,96 206,96 218,100" stroke="${a}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <g transform="rotate(38 280 120)">
      <rect x="270" y="10" width="20" height="210" rx="10" fill="#e8e8f0"/>
      <rect x="274" y="-24" width="12" height="40" rx="4" fill="${a}"/>
      <rect x="275" y="40" width="5" height="160" rx="2.5" fill="#fff"/>
    </g>
    ${estrela(90, 90, 18, "#fff")}${estrela(320, 300, 14, a)}`,

  "dentistica-2": ({ a }) => `
    <path d="M220,180 L120,340 L320,340 Z" fill="${a}" opacity=".35"/>
    <path d="M220,180 L160,340 L280,340 Z" fill="#fff" opacity=".35"/>
    <g transform="rotate(-20 220 120)">
      <rect x="120" y="70" width="200" height="56" rx="28" fill="#2b2f45"/>
      <rect x="140" y="82" width="70" height="10" rx="5" fill="#fff" opacity=".35"/>
      <rect x="250" y="88" width="24" height="20" rx="6" fill="${a}"/>
      <path d="M300,98 C330,98 350,114 350,150 L350,190" stroke="#2b2f45" stroke-width="30" fill="none" stroke-linecap="round"/>
      <circle cx="350" cy="196" r="20" fill="${a}"/><circle cx="350" cy="196" r="10" fill="#fff"/>
    </g>
    ${coroa(150, 290, 50, 60)}${coroa(206, 290, 50, 60)}`,

  "dentistica-3": ({ a, b }) => {
    const tons = ["#fffaf0", "#fbf1dc", "#f5e6c6", "#eedab0", "#e6cc9a", "#dcbd86"];
    return `${tons
      .map(
        (t, i) => `<g transform="rotate(${-50 + i * 20} 200 330)">
        <rect x="186" y="80" width="28" height="200" rx="6" fill="${b}"/>
        <path d="M180,60 C180,40 220,40 220,60 L218,120 C216,140 184,140 182,120 Z" fill="${t}" stroke="rgba(0,0,0,.12)" stroke-width="2"/>
        <text x="200" y="250" font-family="JetBrains Mono" font-weight="700" font-size="14" fill="#fff" text-anchor="middle">A${i + 1}</text></g>`,
      )
      .join("")}<circle cx="200" cy="330" r="22" fill="${a}"/>`;
  },

  "materiais-odontologicos": ({ a }) => `
    <rect x="60" y="210" width="280" height="110" rx="18" fill="#fff" opacity=".22"/>
    <rect x="60" y="200" width="280" height="110" rx="18" fill="#fff" opacity=".35"/>
    <ellipse cx="170" cy="252" rx="56" ry="22" fill="${a}"/>
    <ellipse cx="270" cy="250" rx="30" ry="12" fill="#fff"/>
    <g transform="rotate(-30 230 160)">
      <rect x="140" y="148" width="130" height="18" rx="9" fill="#cfd6e0"/>
      <rect x="268" y="144" width="110" height="26" rx="13" fill="#2b2f45"/>
      <path d="M140,148 L90,154 L90,160 L140,166 Z" fill="#e8edf4"/>
    </g>
    <rect x="96" y="64" width="80" height="92" rx="14" fill="#fff"/><rect x="88" y="52" width="96" height="24" rx="8" fill="${a}"/>
    <rect x="108" y="96" width="56" height="8" rx="4" fill="${a}" opacity=".6"/>`,

  "endodontia-1": ({ a }) => `
    <g transform="translate(110,52) scale(1.8)">
      <path d="${MOLAR}" fill="url(#esmalte)" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
      <path d="M30,40 C30,30 70,30 70,40 L68,58 C64,66 36,66 32,58 Z" fill="${a}"/>
      <path d="M36,58 L30,116 M64,58 L70,116" stroke="${a}" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="34" cy="22" rx="9" ry="5" fill="#fff" opacity=".8" transform="rotate(-25 34 22)"/>
    </g>`,

  "endodontia-2": ({ a }) => `
    <g transform="translate(150,96) scale(1.6)">
      <path d="${INCISIVO}" fill="url(#esmalte)" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
      <path d="M48,30 L50,122" stroke="${a}" stroke-width="7" stroke-linecap="round"/>
    </g>
    <g transform="rotate(-8 230 120)">
      <rect x="216" y="10" width="40" height="64" rx="10" fill="${a}"/>
      <rect x="224" y="20" width="24" height="6" rx="3" fill="#fff" opacity=".6"/>
      <path d="M232,74 L240,74 L238,200 L234,200 Z" fill="#dfe4ee"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<path d="M231,${84 + i * 11} L241,${90 + i * 11}" stroke="#8a93a8" stroke-width="2"/>`).join("")}
    </g>`,

  protese: ({ a }) => `
    <path d="M60,150 C60,330 340,330 340,150 L300,150 C300,280 100,280 100,150 Z" fill="#ff8fb1"/>
    ${[...Array(10).keys()]
      .map((i) => {
        const t = (i + 0.5) / 10;
        const ang = Math.PI * t;
        const x = 200 - Math.cos(ang) * 120;
        const y = 160 + Math.sin(ang) * 112;
        return `<g transform="translate(${x},${y}) rotate(${(t - 0.5) * 160})"><rect x="-16" y="-24" width="32" height="40" rx="12" fill="url(#esmalte)" stroke="rgba(0,0,0,.15)" stroke-width="2"/></g>`;
      })
      .join("")}
    ${estrela(200, 90, 26, a)}${estrela(250, 60, 12, "#fff")}`,

  oclusao: () => `${arcada(186, true, "#ff8fb1", 6)}${arcada(214, false, "#ff8fb1", 6)}
    <path d="M60,200 H340" stroke="#fff" stroke-width="3" stroke-dasharray="6 8" opacity=".7"/>`,

  "disfuncao-temporomandibular": ({ a }) => `
    <path d="M90,90 C90,60 120,50 136,70 L160,150 C170,190 190,250 240,284 C270,304 320,300 340,290 L346,326 C300,346 230,340 190,306 C140,264 118,200 104,150 Z" fill="url(#osso)"/>
    <circle cx="112" cy="74" r="30" fill="url(#osso)"/>
    <path d="M60,40 C100,10 160,20 170,70" stroke="${a}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <circle cx="112" cy="74" r="50" fill="none" stroke="${a}" stroke-width="5" stroke-dasharray="4 10"/>
    ${[0, 1, 2].map((i) => `<path d="M${54 - i * 14},${120 + i * 10} l-24,8" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`).join("")}`,

  implantodontia: ({ a }) => `
    <g transform="translate(140,40) scale(1.2)">${coroa(0, 0, 100, 90, 34)}</g>
    <rect x="186" y="150" width="28" height="30" fill="#c9cfdb"/>
    <path d="M168,180 L232,180 L222,330 L200,350 L178,330 Z" fill="url(#metal)"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${166 + i * 1.4},${196 + i * 20} L${234 - i * 1.4},${186 + i * 20}" stroke="#7d869a" stroke-width="7" stroke-linecap="round"/>`).join("")}
    <path d="M60,250 C120,236 280,236 340,250 L340,370 L60,370 Z" fill="${a}" opacity=".35"/>`,

  anestesiologia: ({ a }) => `
    <g transform="rotate(-38 200 200)">
      <rect x="70" y="170" width="190" height="60" rx="12" fill="#e8ecf4"/>
      <rect x="96" y="180" width="130" height="40" rx="8" fill="${a}"/>
      <rect x="104" y="186" width="70" height="8" rx="4" fill="#fff" opacity=".6"/>
      <rect x="40" y="186" width="34" height="28" rx="6" fill="#c3c9d6"/>
      <rect x="10" y="166" width="20" height="68" rx="10" fill="url(#metal)"/>
      <rect x="20" y="194" width="30" height="12" fill="url(#metal)"/>
      <path d="M260,186 L290,192 L290,208 L260,214 Z" fill="url(#metal)"/>
      <path d="M290,198 L392,200 L290,202 Z" fill="#dfe4ee" stroke="#9aa3b5" stroke-width="2"/>
    </g>
    <circle cx="330" cy="80" r="10" fill="${a}"/><circle cx="352" cy="104" r="6" fill="#fff"/>`,

  cirurgia: ({ a }) => `
    <g transform="rotate(-24 200 200)">
      <path d="M150,40 C140,120 160,190 190,230 L200,240" stroke="url(#metal)" stroke-width="26" fill="none" stroke-linecap="round"/>
      <path d="M250,40 C260,120 240,190 210,230 L200,240" stroke="url(#metal)" stroke-width="26" fill="none" stroke-linecap="round"/>
      <circle cx="200" cy="240" r="16" fill="#9aa3b5"/>
      <path d="M190,250 C170,290 176,330 190,360 M210,250 C230,290 224,330 210,360" stroke="url(#metal)" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M138,60 C132,110 140,160 160,200" stroke="#fff" stroke-width="5" fill="none" opacity=".6" stroke-linecap="round"/>
    </g>
    <g transform="rotate(30 300 280)"><rect x="290" y="180" width="16" height="120" rx="6" fill="${a}"/><path d="M290,180 L298,130 L306,180 Z" fill="url(#metal)"/></g>`,

  "terapia-medicamentosa": ({ a, b }) => `
    <g transform="rotate(-8 180 190)">
      <rect x="80" y="60" width="200" height="260" rx="18" fill="#fff"/>
      <text x="108" y="128" font-family="Plus Jakarta Sans" font-weight="800" font-size="52" fill="${b}">Rx</text>
      ${[0, 1, 2, 3, 4].map((i) => `<rect x="108" y="${160 + i * 28}" width="${i % 2 ? 110 : 144}" height="10" rx="5" fill="${b}" opacity=".35"/>`).join("")}
    </g>
    ${capsula(300, 280, 130, 50, -40, "#fff", a)}
    <circle cx="320" cy="150" r="30" fill="${a}"/><path d="M296,150 H344" stroke="#fff" stroke-width="5" opacity=".8"/>`,

  semiologia: ({ a }) => `
    <g transform="rotate(-30 200 200)">
      <rect x="190" y="210" width="20" height="170" rx="10" fill="url(#metal)"/>
      <rect x="194" y="160" width="12" height="60" fill="#c3c9d6"/>
      <circle cx="200" cy="110" r="70" fill="url(#metal)"/>
      <circle cx="200" cy="110" r="58" fill="${a}" opacity=".85"/>
      <path d="M168,80 C178,66 196,60 214,64" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".8"/>
    </g>
    ${estrela(90, 90, 16, "#fff")}${estrela(320, 300, 20, a)}`,

  "patologia-oral": ({ a }) => `
    <rect x="90" y="330" width="220" height="26" rx="13" fill="#2b2f45"/>
    <path d="M150,330 C150,280 180,250 230,250" stroke="#2b2f45" stroke-width="30" fill="none"/>
    <rect x="120" y="270" width="150" height="16" rx="8" fill="#c3c9d6"/>
    <circle cx="195" cy="262" r="16" fill="${a}"/>
    <g transform="rotate(-28 220 150)">
      <rect x="196" y="40" width="50" height="180" rx="12" fill="#e8ecf4"/>
      <rect x="190" y="30" width="62" height="26" rx="8" fill="${a}"/>
      <rect x="206" y="220" width="30" height="30" rx="4" fill="url(#metal)"/>
      <rect x="208" y="60" width="10" height="120" rx="5" fill="#fff" opacity=".7"/>
    </g>
    <path d="M250,250 C260,240 300,226 320,232" stroke="#e8ecf4" stroke-width="18" fill="none" stroke-linecap="round"/>`,

  radiologia: ({ a }) => `
    <rect x="40" y="90" width="320" height="220" rx="22" fill="#0b0d1a" stroke="${a}" stroke-width="6"/>
    <g opacity=".95">
      ${[...Array(10).keys()].map((i) => `<rect x="${78 + i * 25}" y="${130 + Math.abs(i - 4.5) * 4}" width="20" height="${62 - Math.abs(i - 4.5) * 4}" rx="7" fill="#e9f2ff" opacity="${0.55 + (i % 3) * 0.15}"/>`).join("")}
      ${[...Array(10).keys()].map((i) => `<rect x="${78 + i * 25}" y="208" width="20" height="${62 - Math.abs(i - 4.5) * 4}" rx="7" fill="#e9f2ff" opacity="${0.5 + (i % 2) * 0.2}"/>`).join("")}
    </g>
    <rect x="40" y="196" width="320" height="8" fill="${a}" opacity=".9"/>
    <rect x="40" y="186" width="320" height="28" fill="${a}" opacity=".18"/>`,

  "periodontia-1": ({ a }) => `
    ${dente(CANINO, 110, 70, 1.7)}
    <path d="M60,240 C110,220 130,200 196,206 C262,200 290,220 340,240 L340,360 L60,360 Z" fill="#ff8fb1"/>
    <path d="M60,240 C110,220 130,200 196,206 C262,200 290,220 340,240" stroke="#fff" stroke-width="5" fill="none" opacity=".5"/>
    <g transform="rotate(16 290 160)">
      <rect x="282" y="20" width="16" height="150" rx="8" fill="url(#metal)"/>
      <path d="M286,170 L286,250 L294,250 L294,170 Z" fill="#c3c9d6"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="284" y="${190 + i * 14}" width="12" height="6" fill="${a}"/>`).join("")}
    </g>`,

  "periodontia-2": ({ a }) => `
    ${dente(MOLAR, 110, 70, 1.8)}
    <path d="M50,236 C110,216 140,214 200,226 C260,214 290,216 350,236 L350,370 L50,370 Z" fill="${a}" opacity=".55"/>
    <path d="M50,214 C110,190 140,186 200,198 C260,186 290,190 350,214 L350,236 C290,216 260,214 200,226 C140,214 110,216 50,236 Z" fill="#ff8fb1"/>
    ${[[90, 300], [150, 330], [260, 320], [310, 290], [200, 290]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#fff" opacity=".5"/>`).join("")}`,

  odontopediatria: ({ a }) => `
    <g transform="translate(110,70) scale(1.8)">
      <path d="${MOLAR}" fill="url(#esmalte)" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
      <circle cx="36" cy="50" r="5" fill="#2b1838"/><circle cx="64" cy="50" r="5" fill="#2b1838"/>
      <path d="M38,64 C44,72 56,72 62,64" stroke="#2b1838" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="62" r="6" fill="#ff8fb1" opacity=".8"/><circle cx="74" cy="62" r="6" fill="#ff8fb1" opacity=".8"/>
    </g>
    ${estrela(80, 90, 24, a)}${estrela(330, 120, 18, "#fff")}${estrela(320, 320, 22, a)}${estrela(70, 300, 14, "#fff")}`,

  ortodontia: ({ a }) => {
    const larg = [40, 46, 52, 52, 46, 40];
    let x = 200 - (larg.reduce((s, l) => s + l + 6, 0) - 6) / 2;
    const dentes = larg
      .map((l, i) => {
        const a2 = 120 - Math.abs(i - 2.5) * 12;
        const y = 140 + Math.abs(i - 2.5) * 6;
        const r = `${coroa(x, y, l, a2, 18)}<rect x="${x + l / 2 - 13}" y="${y + a2 / 2 - 13}" width="26" height="26" rx="5" fill="url(#metal)" stroke="#7d869a" stroke-width="2"/>`;
        x += l + 6;
        return r;
      })
      .join("");
    return `<path d="M40,120 Q200,70 360,120 L360,170 Q200,130 40,170 Z" fill="#ff8fb1"/>${dentes}
      <path d="M50,214 Q200,186 350,214" stroke="${a}" stroke-width="6" fill="none"/>`;
  },

  "pacientes-com-necessidades-especiais": ({ a }) => `
    <path d="M200,340 C130,290 64,236 64,164 C64,114 102,80 146,80 C172,80 190,94 200,112 C210,94 228,80 254,80 C298,80 336,114 336,164 C336,236 270,290 200,340 Z" fill="${a}"/>
    <g fill="#fff">
      <circle cx="196" cy="128" r="16"/>
      <path d="M186,150 L202,150 L204,200 L240,200 L262,252 L248,258 L230,218 L188,218 Z"/>
      <path d="M176,176 A52,52 0 1 0 248,248" stroke="#fff" stroke-width="12" fill="none"/>
    </g>`,

  sus: ({ a, b }) => `
    <path d="M200,40 L330,90 L330,190 C330,270 270,320 200,350 C130,320 70,270 70,190 L70,90 Z" fill="#fff"/>
    <path d="M200,62 L310,104 L310,190 C310,256 260,300 200,326 C140,300 90,256 90,190 L90,104 Z" fill="${b}"/>
    <rect x="176" y="120" width="48" height="140" rx="10" fill="${a}"/>
    <rect x="130" y="166" width="140" height="48" rx="10" fill="${a}"/>`,

  "saude-coletiva": ({ a }) => `
    ${pessoa(110, 250, 0.9, a)}${pessoa(290, 250, 0.9, a)}${pessoa(200, 260, 1.15, "#fff")}
    <g transform="translate(170,70) scale(0.6)"><path d="${MOLAR}" fill="url(#esmalte)"/></g>
    <path d="M60,330 H340" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".6"/>`,

  "saude-coletiva-e-farmacologia": ({ a, b }) => `
    ${pessoa(130, 270, 1, "#fff")}${pessoa(240, 280, 0.85, a)}
    ${capsula(290, 110, 140, 52, -35, "#fff", a)}
    <circle cx="120" cy="100" r="34" fill="${a}"/><path d="M94,100 H146" stroke="${b}" stroke-width="6"/>`,

  "odontologia-legal": ({ a }) => `
    <rect x="192" y="70" width="16" height="250" rx="8" fill="${a}"/>
    <rect x="130" y="314" width="140" height="22" rx="11" fill="${a}"/>
    <rect x="70" y="80" width="260" height="14" rx="7" fill="${a}"/>
    <circle cx="200" cy="66" r="16" fill="#fff"/>
    <path d="M90,94 L56,190 M90,94 L124,190 M310,94 L276,190 M310,94 L344,190" stroke="#fff" stroke-width="3"/>
    <path d="M44,190 H136 C136,220 44,220 44,190 Z" fill="#fff"/>
    <path d="M264,190 H356 C356,220 264,220 264,190 Z" fill="#fff"/>
    <g transform="translate(70,130) scale(0.5)"><path d="${MOLAR}" fill="url(#esmalte)"/></g>
    <rect x="282" y="168" width="56" height="20" rx="4" fill="${a}"/>`,
};

// Paleta de cada disciplina: fundo escuro, fundo médio e destaque claro.
const PALETAS = {
  "anatomia-geral": ["#2a0b4a", "#7b35c9", "#f2c9ff"],
  "anatomia-dental": ["#08304f", "#1d86d1", "#bde5ff"],
  "anatomia-de-cabeca-e-pescoco": ["#3f0b29", "#bd2c6b", "#ffc6df"],
  histologia: ["#4b0f2f", "#e0517a", "#ffd3de"],
  fisiologia: ["#4d0b0f", "#d93a36", "#ffd5cb"],
  bioquimica: ["#06352f", "#15a58c", "#c2f6e9"],
  farmacologia: ["#3b2604", "#d4920f", "#ffe8a8"],
  cariologia: ["#3a1d04", "#c76a18", "#ffdcb8"],
  "dentistica-1": ["#1f0d63", "#6a44ff", "#d8ceff"],
  "dentistica-2": ["#061f55", "#2f63ff", "#cbd8ff"],
  "dentistica-3": ["#430d55", "#b04ae0", "#f1d3ff"],
  "materiais-odontologicos": ["#18222d", "#5b7690", "#dde8f2"],
  "endodontia-1": ["#520a1b", "#d02a52", "#ffd0db"],
  "endodontia-2": ["#330a43", "#962bc0", "#eecbff"],
  protese: ["#0b3444", "#22a0c2", "#c6f1ff"],
  oclusao: ["#102a44", "#3a7cc0", "#d2e6ff"],
  "disfuncao-temporomandibular": ["#3b1804", "#de7027", "#ffdbc0"],
  implantodontia: ["#0b302a", "#25ab83", "#c8f6e2"],
  anestesiologia: ["#04293d", "#00a0c6", "#c0f2ff"],
  cirurgia: ["#0b2d22", "#1e8a62", "#c9f0dc"],
  "terapia-medicamentosa": ["#3a0f3a", "#c43ba8", "#ffd0f4"],
  semiologia: ["#1b1c4a", "#4f55d6", "#d2d5ff"],
  "patologia-oral": ["#3c0a24", "#a3245e", "#ffc9e0"],
  radiologia: ["#05121f", "#1b4f7a", "#7fd6ff"],
  "periodontia-1": ["#4a0d22", "#e2456f", "#ffd6e2"],
  "periodontia-2": ["#3b1430", "#a8417f", "#ffcfe8"],
  odontopediatria: ["#3d2a05", "#f0a417", "#fff0b8"],
  ortodontia: ["#0a2338", "#2c8fc9", "#c8ebff"],
  "pacientes-com-necessidades-especiais": ["#2c0f45", "#8d4fe0", "#ffd36e"],
  sus: ["#062a52", "#1667c4", "#ffd34d"],
  "saude-coletiva": ["#0b3324", "#2a9a5c", "#d4f7c4"],
  "saude-coletiva-e-farmacologia": ["#2e2a06", "#a59a12", "#fff3a6"],
  "odontologia-legal": ["#1d1a14", "#7a6440", "#f3dfb0"],
};

function html(d, numero) {
  const [escuro, medio, claro] = PALETAS[d.slug] ?? ["#1f0d63", "#6a44ff", "#d8ceff"];
  const arte = (ARTES[d.slug] ?? ARTES["anatomia-dental"])({ a: claro, b: medio });
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800&family=JetBrains+Mono:wght@500;700&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 600px; height: 800px; overflow: hidden; position: relative; color: #fff; font-family: "Plus Jakarta Sans", sans-serif;
    background: radial-gradient(120% 70% at 50% 62%, ${medio} 0%, ${escuro} 72%); }
  .grade { position: absolute; inset: 0; opacity: .5;
    background-image: linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px);
    background-size: 50px 50px; mask-image: radial-gradient(70% 60% at 50% 60%, #000 30%, transparent 80%); }
  .brilho { position: absolute; left: 50%; top: 61%; width: 460px; height: 460px; transform: translate(-50%, -50%); border-radius: 50%;
    background: radial-gradient(circle, ${claro}55 0%, transparent 65%); }
  .topo { position: absolute; top: 34px; left: 40px; right: 40px; padding-bottom: 16px; border-bottom: 1.5px solid rgba(255,255,255,.35);
    display: flex; justify-content: space-between; font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 17px; letter-spacing: .14em; text-transform: uppercase; }
  .topo span:last-child { color: ${claro}; }
  .titulo { position: absolute; top: 96px; left: 32px; right: 32px; height: 168px; display: flex; align-items: center; justify-content: center; text-align: center;
    font-weight: 800; line-height: .95; letter-spacing: -.03em; text-transform: uppercase; text-shadow: 0 4px 24px rgba(0,0,0,.35); overflow-wrap: normal; }
  .titulo span { display: block; width: 100%; }
  svg { position: absolute; left: 50%; top: 262px; width: 470px; height: 470px; transform: translateX(-50%); filter: drop-shadow(0 18px 30px rgba(0,0,0,.4)); }
  .sombra { position: absolute; inset: auto 0 0 0; height: 230px; background: linear-gradient(transparent, ${escuro}f0 70%); }
  .rodape { position: absolute; left: 40px; right: 40px; bottom: 34px; display: flex; justify-content: space-between; align-items: center; }
  .marca { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 30px; letter-spacing: -.03em; }
  .marca span { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 18px; letter-spacing: .1em; background: #C8F250; color: #12101F; border-radius: 7px; padding: 3px 8px; }
  .sigla { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 20px; letter-spacing: .1em; color: ${claro}; }
</style></head><body>
  <div class="grade"></div><div class="brilho"></div>
  <div class="topo"><span>Resumos OdontoLab</span><span>Lab ${String(numero).padStart(2, "0")}</span></div>
  <div class="titulo"><span id="titulo">${escapar(d.nome)}</span></div>
  <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="esmalte" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f3f0fb"/><stop offset="1" stop-color="#d9d3ea"/></linearGradient>
      <linearGradient id="osso" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e6dcc6"/></linearGradient>
      <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa3b5"/><stop offset=".45" stop-color="#f4f6fa"/><stop offset="1" stop-color="#8a93a8"/></linearGradient>
      <clipPath id="nada"><rect width="0" height="0"/></clipPath>
    </defs>
    ${arte}
  </svg>
  <div class="sombra"></div>
  <div class="rodape"><div class="marca">odonto<span>LAB</span></div><div class="sigla">${escapar(d.sigla)}${d.indice ? ` ${escapar(d.indice)}` : ""}</div></div>
</body></html>`;
}

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 600, height: 800 } });

let geradas = 0;
for (const [i, d] of disciplinas.entries()) {
  if (filtro.length && !filtro.includes(d.slug)) continue;
  if (!ARTES[d.slug]) console.warn(`! ${d.slug}: sem ilustração própria, usando a padrão`);
  await pagina.setContent(html(d, i + 1), { waitUntil: "networkidle" });
  await pagina.evaluate(async () => {
    await document.fonts.ready;
    // Maior fonte em que o nome cabe (sem quebrar palavra) em até 3 linhas.
    const t = document.getElementById("titulo");
    const caixa = t.parentElement;
    for (let tamanho = 96; tamanho > 36; tamanho -= 2) {
      t.style.fontSize = `${tamanho}px`;
      const linhas = Math.round(t.offsetHeight / (tamanho * 0.95));
      if (t.scrollWidth <= t.clientWidth && t.offsetHeight <= caixa.clientHeight && linhas <= 3) break;
    }
  });
  await pagina.screenshot({ path: join(destino, `${d.slug}.jpg`), type: "jpeg", quality: 86 });
  geradas++;
}
await navegador.close();

const comThumb = readdirSync(destino)
  .filter((f) => f.endsWith(".jpg"))
  .map((f) => f.replace(/\.jpg$/, ""))
  .filter((slug) => existsSync(join(destino, `${slug}.jpg`)))
  .sort();
writeFileSync(join(raiz, "src/lib/thumbs.json"), `${JSON.stringify(comThumb, null, 2)}\n`);
console.log(`${geradas} thumb(s) em public/thumbs/`);
