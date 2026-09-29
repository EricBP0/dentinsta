import Link from "next/link";
import { formatarReais, PRECO, totalParcelado } from "@/lib/preco";

const RECURSOS = [
  ["Videoaulas", "Conteúdo gravado por um cirurgião-dentista de referência."],
  ["Resumos e mapas mentais", "Revise a matéria em minutos antes da prova."],
  ["Flashcards", "Repetição espaçada para memorizar de verdade."],
  ["Simulados com IA", "Questões no estilo da sua faculdade, com correção comentada."],
  ["Certificados", "Conclua os itens obrigatórios e receba seu certificado."],
  ["Painel de desempenho", "Notas, horas estudadas e progresso por disciplina."],
];

export default function Inicio() {
  return (
    <main className="flex-1">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="text-xl font-bold text-teal-800">dentinsta</span>
        <Link href="/entrar" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">
          Entrar
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Passe nas provas da faculdade de odontologia
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Tudo o que você precisa para estudar em um só lugar, com IA que corrige suas respostas como um professor.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {RECURSOS.map(([titulo, texto]) => (
          <div key={titulo} className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">{titulo}</h2>
            <p className="mt-1 text-sm text-slate-600">{texto}</p>
          </div>
        ))}
      </section>

      <section id="precos" className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-teal-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-teal-700">Acesso completo</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">
            {PRECO.parcelas}x {formatarReais(PRECO.parcelaCentavos)}
          </p>
          <p className="text-sm text-slate-500">sem juros no cartão ({formatarReais(totalParcelado())})</p>
          <p className="mt-4 text-lg text-slate-900">
            ou <strong>{formatarReais(PRECO.aVistaCentavos)}</strong> à vista
            <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
              {Math.round((1 - PRECO.aVistaCentavos / totalParcelado()) * 100)}% de desconto
            </span>
          </p>
          <ul className="mt-6 space-y-2 text-left text-sm text-slate-700">
            <li>✓ Acesso vitalício ao conteúdo</li>
            <li>✓ Todas as novidades e a IA por 12 meses</li>
            <li>✓ Certificado por disciplina</li>
          </ul>
          <Link href="/entrar" className="mt-6 block rounded-lg bg-teal-700 py-3 font-medium text-white hover:bg-teal-800">
            Quero começar
          </Link>
        </div>
      </section>
    </main>
  );
}
