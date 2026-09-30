import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Ícone da tela inicial do iPhone/iPad (o símbolo da marca).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const simbolo = await readFile(join(process.cwd(), "assets/marca/simbolo-512.png"));
  return new ImageResponse(
    (
      // O símbolo tem cantos arredondados; o iOS arredonda de novo, então o fundo é cheio.
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0F766E" }}>
        <img src={`data:image/png;base64,${simbolo.toString("base64")}`} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
