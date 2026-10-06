import "server-only";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { montarTextoCertificado, type DadosCertificado } from "./texto";

// Cores da marca (docs/MARCA.md).
const VIOLETA = rgb(0.353, 0.247, 0.878); // #5a3fe0
const LILAS = rgb(0.812, 0.776, 1); // #cfc6ff
const LIMA = rgb(0.784, 0.949, 0.314); // #c8f250
const TINTA = rgb(0.071, 0.063, 0.122); // #12101f (Preto da marca)
const CINZA = rgb(0.373, 0.384, 0.439); // #5f6270

async function fonte(nome: string) {
  return readFile(path.join(process.cwd(), "assets", "fontes", nome));
}

async function marca(nome: string) {
  return readFile(path.join(process.cwd(), "assets", "marca", nome));
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

  const [regular, negrito, titulo, mono, icone] = await Promise.all([
    fonte("PlusJakartaSans-Medium.ttf").then((f) => pdf.embedFont(f, { subset: true })),
    fonte("PlusJakartaSans-Bold.ttf").then((f) => pdf.embedFont(f, { subset: true })),
    fonte("PlusJakartaSans-ExtraBold.ttf").then((f) => pdf.embedFont(f, { subset: true })),
    fonte("JetBrainsMono-Bold.ttf").then((f) => pdf.embedFont(f, { subset: true })),
    marca("icone-violeta-512.png").then((f) => pdf.embedPng(f)),
  ]);
  // A4 paisagem
  const pagina = pdf.addPage([841.89, 595.28]);
  const { width: L, height: A } = pagina.getSize();

  // Moldura: faixa violeta no topo com um traço lima (o destaque da marca).
  pagina.drawRectangle({ x: 0, y: 0, width: L, height: A, color: rgb(1, 1, 1) });
  pagina.drawRectangle({ x: 0, y: A - 14, width: L, height: 14, color: VIOLETA });
  pagina.drawRectangle({ x: 0, y: 0, width: L, height: 6, color: VIOLETA });
  pagina.drawRectangle({ x: L / 2 - 40, y: A - 14, width: 80, height: 4, color: LIMA });
  pagina.drawRectangle({ x: 28, y: 28, width: L - 56, height: A - 64, borderColor: LILAS, borderWidth: 2 });

  // Cabeçalho
  // Logo OdontoLab: ícone + "Odonto" (Preto) "Lab" (Violeta), em Plus Jakarta Sans ExtraBold.
  const tamLogo = 22;
  const ladoIcone = 30;
  const larguraOdonto = titulo.widthOfTextAtSize("Odonto", tamLogo);
  const larguraLogo = ladoIcone + 8 + larguraOdonto + titulo.widthOfTextAtSize("Lab", tamLogo);
  const xLogo = (L - larguraLogo) / 2;
  const yLogo = A - 86;
  pagina.drawImage(icone, { x: xLogo, y: yLogo - 7, width: ladoIcone, height: ladoIcone });
  const xTexto = xLogo + ladoIcone + 8;
  pagina.drawText("Odonto", { x: xTexto, y: yLogo, size: tamLogo, font: titulo, color: TINTA });
  pagina.drawText("Lab", { x: xTexto + larguraOdonto, y: yLogo, size: tamLogo, font: titulo, color: VIOLETA });
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
    color: LILAS,
  });
  let y = A - 308;
  for (const linha of quebrarLinhas(texto.corpo, regular, 14, L - 220)) {
    centralizar(pagina, linha, regular, 14, y);
    y -= 22;
  }

  // Assinatura
  const xAssinatura = 120;
  pagina.drawLine({ start: { x: xAssinatura, y: 118 }, end: { x: xAssinatura + 240, y: 118 }, thickness: 1, color: TINTA });
  pagina.drawText(dados.responsavel, { x: xAssinatura, y: 100, size: 11, font: negrito, color: TINTA });
  if (dados.responsavelCargo) {
    pagina.drawText(dados.responsavelCargo, { x: xAssinatura, y: 86, size: 9, font: regular, color: CINZA });
  }
  pagina.drawText(texto.data, { x: xAssinatura, y: 150, size: 11, font: regular, color: TINTA });

  // Validação: QR + código
  const qr = await QRCode.toBuffer(dados.urlValidacao, { margin: 0, width: 240, color: { dark: "#12101f", light: "#ffffff" } });
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
