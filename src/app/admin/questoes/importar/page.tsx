import Link from "next/link";
import { exigirEquipe } from "@/lib/auth";
import { FormularioImportacao } from "./formulario";

export default async function ImportarQuestoes({ searchParams }: PageProps<"/admin/questoes/importar">) {
  const { disciplina } = await searchParams;
  const { supabase } = await exigirEquipe();
  const { data: disciplinas } = await supabase
    .from("disciplinas")
    .select("id, nome")
    .order("ordem")
    .overrideTypes<{ id: string; nome: string }[], { merge: false }>();

  return (
    <div className="space-y-6">
      <Link href="/admin/questoes" className="text-sm text-slate-600 hover:text-slate-900">
        ← Banco de questões
      </Link>
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-tinta">Importar questões por planilha</h1>
        <p className="text-sm text-slate-600">
          Monte a planilha no Excel ou Google Sheets e salve como CSV.{" "}
          <a href="/modelo-questoes.csv" download className="font-medium text-violeta-700 underline">
            Baixar planilha modelo
          </a>
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p className="mb-2 font-medium">Colunas</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>tipo</strong>: objetiva ou discursiva</li>
          <li><strong>tema</strong>: ex. Irrigação (usado nos filtros do simulado)</li>
          <li><strong>dificuldade</strong>: 1, 2, 3 ou fácil, média, difícil</li>
          <li><strong>enunciado</strong></li>
          <li><strong>a, b, c, d, e</strong>: alternativas (só objetivas; deixe vazias as que não usar)</li>
          <li><strong>gabarito</strong>: a letra correta (objetiva) ou a resposta esperada (discursiva)</li>
          <li><strong>explicacao</strong>: aparece para o aluno depois de responder</li>
          <li><strong>rubrica</strong>: só discursivas. Ex.: <code>Cita o hipoclorito: 4 | Explica a ação: 6</code></li>
          <li><strong>estilo</strong>: opcional, ex. USP</li>
        </ul>
      </div>

      <FormularioImportacao
        disciplinas={disciplinas ?? []}
        disciplinaPadrao={typeof disciplina === "string" ? disciplina : undefined}
      />
    </div>
  );
}
