import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Ícone da tela inicial do iPhone/iPad: o selo "oL" sobre o Lima.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const selo = await readFile(join(process.cwd(), "assets/marca/selo-512.png"));
  return new ImageResponse(
    (
      // O selo tem cantos arredondados; o iOS arredonda de novo, então o fundo é cheio.
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#C8F250" }}>
        <img src={`data:image/png;base64,${selo.toString("base64")}`} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
