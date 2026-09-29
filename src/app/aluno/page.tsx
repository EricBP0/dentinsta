import Link from "next/link";
import { BarraProgresso, BotaoRenovar } from "@/components/cadeado";
import { SurgirItem, SurgirLista } from "@/components/movimento";
import { iaAtiva } from "@/lib/acesso";
import { exigirLogin } from "@/lib/auth";
import { carregarCatalogo, formatarData } from "@/lib/catalogo";
import { carregarResumo } from "@/lib/flashcards/sessao";

export default async function Catalogo() {
  const { supabase, perfil } = await exigirLogin();
  const [{ acesso, disciplinas }, resumoFlashcards] = await Promise.all([
    carregarCatalogo(supabase, perfil),
    carregarResumo(supabase),
  ]);
  const flashcardsParaRevisar = resumoFlashcards.reduce((soma, r) => soma + r.vencidos, 0);
  const equipe = perfil.papel !== "aluno";

  const itensBloqueados = disciplinas
    .flatMap((d) => d.modulos.flatMap((m) => m.itens))
    .filter((i) => i.situacao === "renove").length;
  const disciplinasBloqueadas = disciplinas.filter((d) => d.situacao === "renove").length;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Olá{perfil.nome ? `, ${perfil.nome.split(" ")[0]}` : ""}!</h1>

        {!acesso && !equipe && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
            Você ainda não tem acesso ao conteúdo. <Link href="/assinar" className="font-medium underline">Liberar acesso</Link>
          </div>
        )}

        {acesso && (
          <div className="flex flex-wrap gap-3 text-sm">
            {iaAtiva(acesso) ? (
              <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-800">
                Novidades e IA liberadas até {formatarData(acesso.novidadesAte)}
              </span>
            ) : (
              <BotaoRenovar texto="Renove para usar a IA" />
            )}
          </div>
        )}

        {flashcardsParaRevisar > 0 && (
          <Link
            href="/aluno/flashcards?estudar=1"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 hover:bg-sky-100"
          >
            <span>
              🧠 {flashcardsParaRevisar} {flashcardsParaRevisar === 1 ? "flashcard" : "flashcards"} para revisar hoje
            </span>
            <span className="font-medium">Revisar →</span>
          </Link>
        )}

        {itensBloqueados > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <span>
              {itensBloqueados} {itensBloqueados === 1 ? "novo conteúdo" : "novos conteúdos"}
              {disciplinasBloqueadas > 0 && ` e ${disciplinasBloqueadas} ${disciplinasBloqueadas === 1 ? "disciplina" : "disciplinas"}`} desde o seu acesso.
            </span>
            <BotaoRenovar />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Disciplinas</h2>
        {disciplinas.length === 0 && <p className="text-slate-600">Nenhuma disciplina disponível ainda.</p>}
        <SurgirLista className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {disciplinas.map((d) => (
            <SurgirItem
              key={d.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{d.nome}</h3>
                {d.periodo_sugerido && (
                  <span className="shrink-0 text-xs text-slate-500">{d.periodo_sugerido}º período</span>
                )}
              </div>
              {d.descricao && <p className="line-clamp-3 text-sm text-slate-600">{d.descricao}</p>}
              <div className="mt-auto">
                {d.situacao === "em_breve" && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">Em breve</span>
                )}
                {d.situacao === "renove" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-amber-800">Novo</span>
                    <BotaoRenovar />
                  </div>
                )}
                {d.situacao === "sem_acesso" && (
                  <Link href="/assinar" className="text-sm font-medium text-teal-700 underline">
                    Liberar acesso
                  </Link>
                )}
                {d.situacao === "liberada" && (
                  <Link href={`/aluno/disciplinas/${d.slug}`} className="block space-y-2">
                    <BarraProgresso feitos={d.progresso.concluidos} total={d.progresso.total} />
                    <span className="text-sm font-medium text-teal-700">Estudar →</span>
                  </Link>
                )}
              </div>
            </SurgirItem>
          ))}
        </SurgirLista>
      </section>
    </div>
  );
}
