import "server-only";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { montarTextoCertificado, type DadosCertificado } from "./texto";

// Cores da marca (docs/MARCA.md).
const VIOLETA = rgb(0.357, 0.239, 0.941); // #5b3df0
const VIOLETA_CLARO = rgb(0.886, 0.867, 0.992); // #e2ddfd
const LIMA = rgb(0.784, 0.949, 0.314); // #c8f250
const TINTA = rgb(0.071, 0.071, 0.11); // #12121c
const CINZA = rgb(0.373, 0.384, 0.439); // #5f6270

async function fonte(nome: string) {
  return readFile(path.join(process.cwd(), "assets", "fontes", nome));
}

/** Quebra o texto em linhas que caibam na largura. */
function quebrarLinhas(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(tentativa, tamanho) > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function centralizar(pagina: PDFPage, texto: string, fonte: PDFFont, tamanho: number, y: number, cor = TINTA) {
  const largura = fonte.widthOfTextAtSize(texto, tamanho);
  pagina.drawText(texto, { x: (pagina.getWidth() - largura) / 2, y, size: tamanho, font: fonte, color: cor });
}

/** Nome grande, reduzindo a fonte se for muito comprido. */
function tamanhoQueCabe(texto: string, fonte: PDFFont, inicial: number, largura: number) {
  let tamanho = inicial;
  while (tamanho > 14 && fonte.widthOfTextAtSize(texto, tamanho) > largura) tamanho -= 1;
  return tamanho;
}

export async function gerarPdfCertificado(dados: DadosCertificado): Promise<Uint8Array> {
  const texto = montarTextoCertificado(dados);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Certificado — ${dados.disciplina}`);
  pdf.setAuthor(dados.plataforma);
  pdf.setSubject(`Código de validação ${dados.codigo}`);

  const [regular, seminegrito, negrito, titulo, mono] = await Promise.all([
    fonte("InstrumentSans-Regular.ttf").then((f) => pdf.embedFont(f, { subset: true })),
    fonte("InstrumentSans-SemiBold.ttf").then((f) => pdf.embedFont(f, { subset: true })),
    fonte("InstrumentSans-Bold.ttf").then((f) => pdf.embedFont(f, { subset: true })),
    fonte("BricolageGrotesque-ExtraBold.ttf").then((f) => pdf.embedFont(f, { subset: true })),
    fonte("JetBrainsMono-Bold.ttf").then((f) => pdf.embedFont(f, { subset: true })),
  ]);

  // A4 paisagem
  const pagina = pdf.addPage([841.89, 595.28]);
  const { width: L, height: A } = pagina.getSize();

  // Moldura: faixa violeta no topo com um traço lima (o destaque da marca).
  pagina.drawRectangle({ x: 0, y: 0, width: L, height: A, color: rgb(1, 1, 1) });
  pagina.drawRectangle({ x: 0, y: A - 14, width: L, height: 14, color: VIOLETA });
  pagina.drawRectangle({ x: 0, y: 0, width: L, height: 6, color: VIOLETA });
  pagina.drawRectangle({ x: L / 2 - 40, y: A - 14, width: 80, height: 4, color: LIMA });
  pagina.drawRectangle({ x: 28, y: 28, width: L - 56, height: A - 64, borderColor: VIOLETA_CLARO, borderWidth: 2 });

  // Cabeçalho
  // Logo OdontoLab: "odonto" (Bricolage, tinta) + selo "LAB" (mono, branco sobre violeta).
  const tamLogo = 24;
  const larguraOdonto = titulo.widthOfTextAtSize("odonto", tamLogo);
  const tamLab = 10;
  const espacoLab = 1.2; // letras espaçadas, como no logo
  const larguraLab = mono.widthOfTextAtSize("LAB", tamLab) + 2 * espacoLab;
  const larguraSelo = larguraLab + 10;
  const larguraLogo = larguraOdonto + 6 + larguraSelo;
  const xLogo = (L - larguraLogo) / 2;
  const yLogo = A - 86;
  pagina.drawText("odonto", { x: xLogo, y: yLogo, size: tamLogo, font: titulo, color: TINTA });
  const xSelo = xLogo + larguraOdonto + 6;
  pagina.drawRectangle({ x: xSelo, y: yLogo - 1, width: larguraSelo, height: 17, color: VIOLETA });
  let xLetra = xSelo + 5;
  for (const letra of "LAB") {
    pagina.drawText(letra, { x: xLetra, y: yLogo + 4, size: tamLab, font: mono, color: rgb(1, 1, 1) });
    xLetra += mono.widthOfTextAtSize(letra, tamLab) + espacoLab;
  }
  centralizar(pagina, "Certificado", titulo, 44, A - 142);
  centralizar(pagina, "DE CONCLUSÃO", mono, 12, A - 166, VIOLETA);

  // Corpo
  centralizar(pagina, texto.abertura, regular, 14, A - 222, CINZA);
  const tamanhoNome = tamanhoQueCabe(dados.nomeAluno, negrito, 30, L - 160);
  centralizar(pagina, dados.nomeAluno, negrito, tamanhoNome, A - 262);
  pagina.drawLine({
    start: { x: L / 2 - 180, y: A - 276 },
    end: { x: L / 2 + 180, y: A - 276 },
    thickness: 1,
    color: VIOLETA_CLARO,
  });
  let y = A - 308;
  for (const linha of quebrarLinhas(texto.corpo, regular, 14, L - 220)) {
    centralizar(pagina, linha, regular, 14, y);
    y -= 22;
  }

  // Assinatura
  const xAssinatura = 120;
  pagina.drawLine({ start: { x: xAssinatura, y: 118 }, end: { x: xAssinatura + 240, y: 118 }, thickness: 1, color: TINTA });
  pagina.drawText(dados.responsavel, { x: xAssinatura, y: 100, size: 11, font: seminegrito, color: TINTA });
  if (dados.responsavelCargo) {
    pagina.drawText(dados.responsavelCargo, { x: xAssinatura, y: 86, size: 9, font: regular, color: CINZA });
  }
  pagina.drawText(texto.data, { x: xAssinatura, y: 150, size: 11, font: regular, color: TINTA });

  // Validação: QR + código
  const qr = await QRCode.toBuffer(dados.urlValidacao, { margin: 0, width: 240, color: { dark: "#12121c", light: "#ffffff" } });
  const imagemQr = await pdf.embedPng(qr);
  const lado = 78;
  const xQr = L - 120 - lado;
  pagina.drawImage(imagemQr, { x: xQr, y: 84, width: lado, height: lado });
  const infoX = xQr - 12;
  const direita = (t: string, f: PDFFont, s: number, yy: number, cor = CINZA) =>
    pagina.drawText(t, { x: infoX - f.widthOfTextAtSize(t, s), y: yy, size: s, font: f, color: cor });
  direita("Código de validação", regular, 9, 146);
  direita(dados.codigo, mono, 12, 131, TINTA);
  direita("Confira a autenticidade em", regular, 9, 110);
  direita(dados.urlValidacao.replace(/^https?:\/\//, ""), regular, 9, 97, VIOLETA);

  // Rodapé
  centralizar(pagina, texto.rodape, regular, 8, 44, CINZA);

  return pdf.save();
}
