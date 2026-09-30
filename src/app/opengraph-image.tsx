import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Imagem de compartilhamento (WhatsApp, Instagram, LinkedIn…), gerada no build.
export const alt = "OdontoLab — o laboratório de estudos da graduação em Odontologia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [sora, geist, simbolo] = await Promise.all([
    readFile(join(process.cwd(), "assets/fontes/Sora-Bold.ttf")),
    readFile(join(process.cwd(), "assets/fontes/Geist-Regular.ttf")),
    readFile(join(process.cwd(), "assets/marca/simbolo-512.png")),
  ]);
  const simboloUrl = `data:image/png;base64,${simbolo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0B1F24",
          backgroundImage:
            "radial-gradient(circle at 88% 12%, rgba(20,184,166,0.45), transparent 45%), radial-gradient(circle at 8% 110%, rgba(255,122,89,0.30), transparent 40%)",
          color: "white",
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={simboloUrl} width={84} height={84} alt="" />
          <div style={{ display: "flex", fontFamily: "Sora", fontSize: 56, letterSpacing: -1.5 }}>
            Odonto<span style={{ color: "#5EEAD4" }}>Lab</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontFamily: "Sora", fontSize: 64, lineHeight: 1.1, letterSpacing: -2, maxWidth: 940 }}>
            O laboratório de estudos da graduação em Odontologia
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#99F6E4" }}>
            Videoaulas · resumos · mapas mentais · flashcards · simulados com correção por IA
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Sora", data: sora, style: "normal", weight: 700 },
        { name: "Geist", data: geist, style: "normal", weight: 400 },
      ],
    },
  );
}
