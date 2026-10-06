import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Tipografia da marca (docs/MARCA.md): Plus Jakarta Sans (ExtraBold nos títulos,
// Medium no texto) e JetBrains Mono nos rótulos ("LAB 16 · RADIOLOGIA · FIG. 16").
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "OdontoLab — o laboratório de estudos da graduação em Odontologia", template: "%s · OdontoLab" },
  description:
    "Videoaulas, resumos, mapas mentais, flashcards e simulados com correção por IA para passar nas provas da faculdade de Odontologia.",
  applicationName: "OdontoLab",
  openGraph: { siteName: "OdontoLab", locale: "pt_BR", type: "website" },
};

export const viewport: Viewport = { themeColor: "#5A3FE0" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
