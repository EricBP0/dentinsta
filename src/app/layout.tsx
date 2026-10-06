import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Tipografia da marca (docs/MARCA.md): títulos em Bricolage Grotesque, texto em
// Instrument Sans e rótulos ("LAB 01 · FIG. 01") em JetBrains Mono.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
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

export const viewport: Viewport = { themeColor: "#5B3DF0" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
