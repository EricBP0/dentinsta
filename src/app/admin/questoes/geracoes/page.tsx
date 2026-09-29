import Link from "next/link";
import { botaoPrimario, botaoSecundario, Selo } from "@/components/admin-ui";
import { AtualizarPeriodicamente } from "@/components/atualizar-periodicamente";
import { exigirEquipe } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import { aprovarTodasDaGeracao, verificarGeracoes } from "../gerar/actions";

type LinhaGeracao = {
  id: string;
  alvo: "questoes" | "flashcards";
  item_id: string | null;
  status: "processando" | "importando" | "concluida" | "erro";
  tipo_material: "conteudo" | "prova";
  arquivos: { nome: string }[];
  config: { objetivas: number; discursivas: number; cards?: number; tema: string };
  erro: string | null;
  observacoes: string | null;
  questoes_geradas: number;
  questoes_descartadas: number;
  criado_em: string;
  disciplinas: { nome: string };
};

const STATUS = {
  processando: { selo: "em_breve", texto: "Processando" },
  importando: { selo: "em_breve", texto: "Importando" },
  concluida: { selo: "publicada", texto: "Concluída" },
  erro: { selo: "arquivada", texto: "Erro" },
} as const;

export default async function Geracoes() {
  const { supabase } = await exigirEquipe();
  const { data } = await supabase
    .from("geracoes_questoes")
    .select(
      "id, alvo, item_id, status, tipo_material, arquivos, config, erro, observacoes, questoes_geradas, questoes_descartadas, criado_em, disciplinas(nome)",
    )
    .order("criado_em", { ascending: false })
    .limit(50)
    .overrideTypes<LinhaGeracao[], { merge: false }>();
  const geracoes = data ?? [];

  const concluidas = geracoes.filter((g) => g.status === "concluida");
  const [{ data: questoesRascunho }, { data: cardsRascunho }] = await Promise.all([
    supabase
      .from("questoes")
      .select("geracao_id")
      .in("geracao_id", concluidas.filter((g) => g.alvo === "questoes").map((g) => g.id))
      .eq("status", "rascunho")
      .overrideTypes<{ geracao_id: string }[], { merge: false }>(),
    supabase
      .from("flashcards")
      .select("geracao_id")
      .in("geracao_id", concluidas.filter((g) => g.alvo === "flashcards").map((g) => g.id))
      .eq("status", "rascunho")
      .overrideTypes<{ geracao_id: string }[], { merge: false }>(),
  ]);
  const pendentesRevisao = new Map<string, number>();
  for (const r of [...(questoesRascunho ?? []), ...(cardsRascunho ?? [])]) {
    pendentesRevisao.set(r.geracao_id, (pendentesRevisao.get(r.geracao_id) ?? 0) + 1);
  }

  const emAndamento = geracoes.some((g) => g.status === "processando" || g.status === "importando");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/questoes" className="text-sm text-slate-600 hover:text-slate-900">
            ← Banco de questões
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Gerações por IA</h1>
        </div>
        <div className="flex gap-2">
          <form action={verificarGeracoes}>
            <button className={botaoSecundario + " px-4 py-2 text-sm"}>Verificar agora</button>
          </form>
          <Link href="/admin/questoes/gerar" className={botaoPrimario}>
            Nova geração
          </Link>
        </div>
      </header>

      {emAndamento && (
        <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          Há gerações em andamento. Esta página confere a cada 30 segundos — pode fechar e voltar depois.
          <AtualizarPeriodicamente segundos={30} acao={verificarGeracoes} />
        </p>
      )}

      <ul className="space-y-3">
        {geracoes.length === 0 && <li className="text-sm text-slate-600">Nenhuma geração ainda.</li>}
        {geracoes.map((g) => {
          const aRevisar = pendentesRevisao.get(g.id) ?? 0;
          const flashcards = g.alvo === "flashcards";
          const unidade = flashcards ? "cards" : "questões";
          return (
            <li key={g.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">
                    {g.disciplinas.nome}
                    {g.config.tema && ` · ${g.config.tema}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatarData(g.criado_em)} · pedido:{" "}
                    {flashcards
                      ? `${g.config.cards ?? 0} flashcards`
                      : `${g.config.objetivas} objetivas, ${g.config.discursivas} discursivas`}
                    {g.tipo_material === "prova" && " · a partir de prova antiga"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {g.arquivos.map((a) => a.nome).join(", ") || "Texto colado"}
                  </p>
                </div>
                <Selo status={STATUS[g.status].selo} texto={STATUS[g.status].texto} />
              </div>

              {g.status === "erro" && g.erro && <p className="text-sm text-red-700">{g.erro}</p>}

              {g.status === "concluida" && (
                <div className="space-y-2 text-sm">
                  <p className="text-slate-700">
                    {g.questoes_geradas} {flashcards ? "cards criados" : "questões criadas"}
                    {g.questoes_descartadas > 0 && ` · ${g.questoes_descartadas} descartados (inválidos ou repetidos)`}
                    {aRevisar > 0 ? ` · ${aRevisar} aguardando revisão` : " · todas revisadas"}
                  </p>
                  {g.observacoes && (
                    <p className="rounded-lg bg-slate-50 p-2 text-slate-600">
                      <strong>Observação da IA:</strong> {g.observacoes}
                    </p>
                  )}
                  {g.questoes_geradas > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={flashcards ? `/admin/itens/${g.item_id}` : `/admin/questoes?geracao=${g.id}`}
                        className={botaoPrimario}
                      >
                        Revisar {unidade}
                      </Link>
                      {aRevisar > 0 && (
                        <form action={aprovarTodasDaGeracao}>
                          <input type="hidden" name="geracao_id" value={g.id} />
                          <input type="hidden" name="alvo" value={g.alvo} />
                          <button className={botaoSecundario + " px-4 py-2 text-sm"}>
                            {flashcards ? "Publicar todos" : "Aprovar todas"} ({aRevisar})
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
