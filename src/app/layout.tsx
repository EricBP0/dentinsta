import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Geist, Sora } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Fonte da marca, usada no logotipo e nos títulos (docs/MARCA.md).
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "OdontoLab — o laboratório de estudos da graduação em Odontologia", template: "%s · OdontoLab" },
  description:
    "Videoaulas, resumos, mapas mentais, flashcards e simulados com correção por IA para passar nas provas da faculdade de Odontologia.",
  applicationName: "OdontoLab",
  openGraph: { siteName: "OdontoLab", locale: "pt_BR", type: "website" },
};

export const viewport: Viewport = { themeColor: "#0F766E" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${sora.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
