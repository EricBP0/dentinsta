import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Imagem de compartilhamento (WhatsApp, Instagram, LinkedIn…), gerada no build.
// Mesmo desenho dos carrosséis: violeta quadriculado, título em Plus Jakarta Sans
// ExtraBold, rótulos em JetBrains Mono e o Verde-limão só como destaque.
export const alt = "OdontoLab — o laboratório de estudos da graduação em Odontologia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fonte = (arquivo: string) => readFile(join(process.cwd(), "assets/fontes", arquivo));

export default async function Image() {
  const [extrabold, medium, mono, icone] = await Promise.all([
    fonte("PlusJakartaSans-ExtraBold.ttf"),
    fonte("PlusJakartaSans-Medium.ttf"),
    fonte("JetBrainsMono-Bold.ttf"),
    readFile(join(process.cwd(), "assets/marca/icone-512.png")),
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
          background: "#5A3FE0",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.09) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.09) 2px, transparent 2px)",
          backgroundSize: "60px 60px",
          color: "white",
          fontFamily: "Jakarta",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ ...rotulo, display: "flex", background: "#12101F", color: "#C8F250", borderRadius: 10, padding: "8px 14px" }}>
            Lab 01
          </div>
          <div style={{ ...rotulo, display: "flex" }}>Graduação em Odontologia</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Jakarta", fontWeight: 800, fontSize: 80, lineHeight: 1.02, letterSpacing: -2.5 }}>
            <span>O laboratório de estudos</span>
            <span style={{ color: "#C8F250" }}>da Odontologia.</span>
          </div>
          <div style={{ display: "flex", fontSize: 28, opacity: 0.9 }}>
            Resumos, flashcards, videoaulas e simulados com correção por IA.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={`data:image/png;base64,${icone.toString("base64")}`} width={60} height={60} alt="" />
          <span style={{ display: "flex", fontWeight: 800, fontSize: 40, letterSpacing: -1 }}>
            Odonto<span style={{ color: "#C8F250" }}>Lab</span>
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Jakarta", data: extrabold, style: "normal", weight: 800 },
        { name: "Jakarta", data: medium, style: "normal", weight: 500 },
        { name: "JetBrains Mono", data: mono, style: "normal", weight: 700 },
      ],
    },
  );
}
