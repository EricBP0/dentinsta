import Link from "next/link";
import { exigirLogin } from "@/lib/auth";
import { carregarCatalogo } from "@/lib/catalogo";
import { carregarResumo, carregarSessao } from "@/lib/flashcards/sessao";
import { SessaoEstudo } from "./sessao-estudo";

export default async function RevisaoDoDia({ searchParams }: PageProps<"/aluno/flashcards">) {
  const { estudar } = await searchParams;
  const { supabase, perfil } = await exigirLogin();
  const [{ disciplinas }, resumo] = await Promise.all([carregarCatalogo(supabase, perfil), carregarResumo(supabase)]);

  // Decks liberados, com nome da disciplina, na ordem do catálogo.
  const decks = disciplinas.flatMap((d) =>
    d.modulos.flatMap((m) =>
      m.itens
        .filter((i) => i.tipo === "flashcards" && i.situacao === "liberado")
        .map((i) => ({ id: i.id, titulo: i.titulo, disciplina: d.nome, resumo: resumo.find((r) => r.item_id === i.id) })),
    ),
  );
  const nomesDecks = Object.fromEntries(decks.map((d) => [d.id, `${d.disciplina} · ${d.titulo}`]));
  const vencidos = resumo.reduce((soma, r) => soma + r.vencidos, 0);
  const novos = resumo.reduce((soma, r) => soma + (r.total - r.vistos), 0);

  if (estudar === "1") {
    const cards = await carregarSessao(supabase, perfil.id, null);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/aluno/flashcards" className="text-sm text-slate-600 hover:text-slate-900">
          ← Flashcards
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Revisão do dia</h1>
        <SessaoEstudo cards={cards} nomesDecks={nomesDecks} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Flashcards</h1>
          <p className="text-sm text-slate-600">
            Repetição espaçada: cada card volta no momento certo para você não esquecer.
          </p>
        </div>
        {vencidos + novos > 0 && (
          <Link href="/aluno/flashcards?estudar=1" className="rounded-lg bg-teal-700 px-5 py-3 font-medium text-white hover:bg-teal-800">
            Revisar agora ({vencidos} para revisar{novos > 0 && `, ${novos} novos`})
          </Link>
        )}
      </header>

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {decks.length === 0 && <li className="p-4 text-sm text-slate-600">Nenhum deck de flashcards liberado ainda.</li>}
        {decks.map((d) => (
          <li key={d.id}>
            <Link href={`/aluno/itens/${d.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-900">{d.titulo}</p>
                <p className="text-xs text-slate-500">{d.disciplina}</p>
              </div>
              <p className="text-sm text-slate-600">
                {d.resumo ? (
                  <>
                    {d.resumo.vistos}/{d.resumo.total} vistos
                    {d.resumo.vencidos > 0 && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                        {d.resumo.vencidos} para revisar
                      </span>
                    )}
                  </>
                ) : (
                  "Sem cards ainda"
                )}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
