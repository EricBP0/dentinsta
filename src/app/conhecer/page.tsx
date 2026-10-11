import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormularioContato } from "@/components/formulario-contato";
import { Logo } from "@/components/marca/logo";
import { obterSessao } from "@/lib/auth";
import { contatoDoLead } from "@/lib/lead";
import { registrarLead } from "./actions";

export const metadata: Metadata = { title: "Conheça a OdontoLab" };

/** "Quero conhecer": nome, e-mail e WhatsApp, depois os planos. */
export default async function Conhecer() {
  const [{ perfil }, lead] = await Promise.all([obterSessao(), contatoDoLead()]);
  if (perfil || lead) redirect("/assinar");

  return (
    <main className="fundo-marca flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" aria-label="OdontoLab — início" className="inline-block">
          <Logo />
        </Link>
        <div className="space-y-5 rounded-3xl border-2 border-tinta bg-white p-6 shadow-[6px_6px_0_0_var(--color-lima)]">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-tinta">Conheça a OdontoLab</h1>
            <p className="text-slate-600">Deixe seu contato e veja os planos. Na hora de assinar, não pedimos de novo.</p>
            <ul className="space-y-1 pt-1 text-sm text-slate-700">
              {["Disciplinas com videoaulas, resumos e mapas mentais", "Simulados com correção por IA", "Flashcards, Chat IA e Consultório"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-violeta-700" /> {item}
                  </li>
                ),
              )}
            </ul>
          </div>
          <FormularioContato acao={registrarLead} botao="Ver os planos" enviandoTexto="Carregando…" />
          <p className="text-center text-xs text-slate-500">
            Usamos seu contato para falar sobre a OdontoLab. Sem spam.
          </p>
        </div>
        <p className="text-center text-sm text-slate-600">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-semibold text-violeta-700 underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
