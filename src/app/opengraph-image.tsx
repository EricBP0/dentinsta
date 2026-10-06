import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Imagem de compartilhamento (WhatsApp, Instagram, LinkedIn…), gerada no build.
// Mesmo desenho das capas do Instagram: violeta quadriculado, título em
// Bricolage, rótulos em JetBrains Mono e o Lima só como destaque.
export const alt = "OdontoLab — o laboratório de estudos da graduação em Odontologia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fonte = (arquivo: string) => readFile(join(process.cwd(), "assets/fontes", arquivo));

export default async function Image() {
  const [bricolage, instrument, mono] = await Promise.all([
    fonte("BricolageGrotesque-ExtraBold.ttf"),
    fonte("InstrumentSans-Regular.ttf"),
    fonte("JetBrainsMono-Bold.ttf"),
  ]);
  const rotulo = { fontFamily: "JetBrains Mono", fontSize: 22, letterSpacing: 3, textTransform: "uppercase" } as const;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#5B3DF0",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.09) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.09) 2px, transparent 2px)",
          backgroundSize: "60px 60px",
          color: "white",
          fontFamily: "Instrument Sans",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ ...rotulo, display: "flex", background: "#C8F250", color: "#12121C", borderRadius: 10, padding: "8px 14px" }}>
            Lab 01
          </div>
          <div style={{ ...rotulo, display: "flex" }}>Graduação em Odontologia</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Bricolage Grotesque", fontSize: 84, lineHeight: 0.98, letterSpacing: -3 }}>
            <span>O laboratório de estudos</span>
            <span style={{ color: "#C8F250" }}>da Odontologia.</span>
          </div>
          <div style={{ display: "flex", fontSize: 28, opacity: 0.9 }}>
            Resumos, flashcards, videoaulas e simulados com correção por IA.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "Bricolage Grotesque", fontSize: 40, letterSpacing: -1.5 }}>odonto</span>
          <span style={{ ...rotulo, display: "flex", fontSize: 20, background: "#C8F250", color: "#12121C", borderRadius: 7, padding: "4px 9px" }}>
            Lab
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage Grotesque", data: bricolage, style: "normal", weight: 800 },
        { name: "Instrument Sans", data: instrument, style: "normal", weight: 400 },
        { name: "JetBrains Mono", data: mono, style: "normal", weight: 700 },
      ],
    },
  );
}
