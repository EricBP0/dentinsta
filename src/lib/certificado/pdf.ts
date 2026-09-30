import "server-only";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { montarTextoCertificado, type DadosCertificado } from "./texto";

const TEAL_ESCURO = rgb(0.059, 0.463, 0.431); // #0f766e
const TEAL_CLARO = rgb(0.8, 0.984, 0.945); // #ccfbf1
const TINTA = rgb(0.043, 0.122, 0.141); // #0b1f24 (tinta da marca)
const CORAL = rgb(1, 0.478, 0.349); // #ff7a59
const CINZA = rgb(0.392, 0.455, 0.545); // #64748b

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

  const [regular, seminegrito, negrito, fonteMarca, simbolo] = await Promise.all([
    fonte("Geist-Regular.ttf").then((f) => pdf.embedFont(f, { subset: true })),
    fonte("Geist-SemiBold.ttf").then((f) => pdf.embedFont(f, { subset: true })),
    fonte("Geist-Bold.ttf").then((f) => pdf.embedFont(f, { subset: true })),
    fonte("Sora-Bold.ttf").then((f) => pdf.embedFont(f, { subset: true })),
    marca("simbolo-512.png").then((f) => pdf.embedPng(f)),
  ]);

  // A4 paisagem
  const pagina = pdf.addPage([841.89, 595.28]);
  const { width: L, height: A } = pagina.getSize();

  // Moldura
  pagina.drawRectangle({ x: 0, y: 0, width: L, height: A, color: rgb(1, 1, 1) });
  pagina.drawRectangle({ x: 0, y: A - 14, width: L, height: 14, color: TEAL_ESCURO });
  pagina.drawRectangle({ x: 0, y: 0, width: L, height: 6, color: TEAL_ESCURO });
  pagina.drawRectangle({ x: L / 2 - 40, y: A - 14, width: 80, height: 4, color: CORAL });
  pagina.drawRectangle({ x: 28, y: 28, width: L - 56, height: A - 64, borderColor: TEAL_CLARO, borderWidth: 2 });

  // Cabeçalho
  // Logo OdontoLab: símbolo + "Odonto" (tinta) "Lab" (teal), em Sora.
  const tamLogo = 20;
  const ladoSimbolo = 28;
  const larguraOdonto = fonteMarca.widthOfTextAtSize("Odonto", tamLogo);
  const larguraLogo = ladoSimbolo + 8 + larguraOdonto + fonteMarca.widthOfTextAtSize("Lab", tamLogo);
  const xLogo = (L - larguraLogo) / 2;
  const yLogo = A - 88;
  pagina.drawImage(simbolo, { x: xLogo, y: yLogo - 6, width: ladoSimbolo, height: ladoSimbolo });
  const xTexto = xLogo + ladoSimbolo + 8;
  pagina.drawText("Odonto", { x: xTexto, y: yLogo, size: tamLogo, font: fonteMarca, color: TINTA });
  pagina.drawText("Lab", { x: xTexto + larguraOdonto, y: yLogo, size: tamLogo, font: fonteMarca, color: TEAL_ESCURO });
  centralizar(pagina, "CERTIFICADO", negrito, 40, A - 140);
  centralizar(pagina, "DE CONCLUSÃO", seminegrito, 14, A - 164, CINZA);

  // Corpo
  centralizar(pagina, texto.abertura, regular, 14, A - 222, CINZA);
  const tamanhoNome = tamanhoQueCabe(dados.nomeAluno, negrito, 30, L - 160);
  centralizar(pagina, dados.nomeAluno, negrito, tamanhoNome, A - 262);
  pagina.drawLine({
    start: { x: L / 2 - 180, y: A - 276 },
    end: { x: L / 2 + 180, y: A - 276 },
    thickness: 1,
    color: TEAL_CLARO,
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
  const qr = await QRCode.toBuffer(dados.urlValidacao, { margin: 0, width: 240, color: { dark: "#0f172a", light: "#ffffff" } });
  const imagemQr = await pdf.embedPng(qr);
  const lado = 78;
  const xQr = L - 120 - lado;
  pagina.drawImage(imagemQr, { x: xQr, y: 84, width: lado, height: lado });
  const infoX = xQr - 12;
  const direita = (t: string, f: PDFFont, s: number, yy: number, cor = CINZA) =>
    pagina.drawText(t, { x: infoX - f.widthOfTextAtSize(t, s), y: yy, size: s, font: f, color: cor });
  direita("Código de validação", regular, 9, 146);
  direita(dados.codigo, seminegrito, 12, 131, TINTA);
  direita("Confira a autenticidade em", regular, 9, 110);
  direita(dados.urlValidacao.replace(/^https?:\/\//, ""), regular, 9, 97, TEAL_ESCURO);

  // Rodapé
  centralizar(pagina, texto.rodape, regular, 8, 44, CINZA);

  return pdf.save();
}
