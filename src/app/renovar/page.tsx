import Link from "next/link";

// Placeholder até a integração com o Stripe (etapa "Venda e certificado").
export default function Renovar() {
  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Renove seu acesso</h1>
      <p className="text-slate-600">
        Libere todo o conteúdo novo e a IA por mais 12 meses. A renovação estará disponível em breve.
      </p>
      <Link href="/aluno" className="text-sm font-medium text-teal-700 underline">
        Voltar para os estudos
      </Link>
    </main>
  );
}
