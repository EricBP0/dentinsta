import { ArrowRight, KeyRound } from "lucide-react";
import Link from "next/link";
import { CabecalhoPagina } from "@/components/sistema";
import { exigirAdmin } from "@/lib/auth";
import { textoParam } from "@/lib/listagem";
import { alvosDoUso, custoEstimado, esforcoDoUso, lerLista, type UsoIA } from "@/lib/ia/provedores/config";

type Linha = { modelo: string; tipo: string; chamadas: number; tokens_entrada: number; tokens_saida: number; tokens_cache: number };

const USOS: { uso: UsoIA; nome: string; variavel: string; tipos: string[] }[] = [
  { uso: "correcao", nome: "Correção das discursivas", variavel: "IA_CORRECAO", tipos: ["correcao"] },
  { uso: "chat", nome: "Chat IA", variavel: "IA_CHAT", tipos: ["chat"] },
  { uso: "geracao", nome: "Geração de questões e flashcards", variavel: "IA_GERACAO", tipos: ["geracao", "geracao_flashcards"] },
];
const NOME_TIPO: Record<string, string> = {
  correcao: "Correção",
  chat: "Chat",
  geracao: "Geração de questões",
  geracao_flashcards: "Geração de flashcards",
};
const PERIODOS = [7, 30, 90];
const LOTE = new Set(["geracao", "geracao_flashcards"]);

const dolares = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: v < 1 ? 4 : 2 });
const milhar = (v: number) => v.toLocaleString("pt-BR");

export default async function PaginaIA({ searchParams }: PageProps<"/admin/ia">) {
  const pedido = Number(textoParam((await searchParams).dias));
  const dias = PERIODOS.includes(pedido) ? pedido : 30;
  const { supabase } = await exigirAdmin();
  const { data } = await supabase.rpc("resumo_uso_ia", { p_dias: dias });
  const linhas = ((data ?? []) as Linha[]).map((l) => {
    const uso = { entrada: Number(l.tokens_entrada), saida: Number(l.tokens_saida), cache: Number(l.tokens_cache) };
    return { ...l, chamadas: Number(l.chamadas), uso, custo: custoEstimado(l.modelo, uso, { lote: LOTE.has(l.tipo) }) };
  });
  const chaves = { gemini: Boolean(process.env.GEMINI_API_KEY), anthropic: Boolean(process.env.ANTHROPIC_API_KEY) };

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        tom="tinta"
        rotulo="Backoffice · IA"
        titulo="Provedores de IA"
        descricao="Qual modelo atende cada uso, em ordem: se o primeiro falhar ou recusar, o próximo assume. Compare custo e uso por modelo."
      />

      <section className="grid gap-3 sm:grid-cols-2">
        {(["gemini", "anthropic"] as const).map((p) => (
          <p key={p} className="flex items-center gap-2 rounded-2xl border-2 border-tinta bg-white p-4 text-sm">
            <KeyRound className="size-4" />
            <strong>{p === "gemini" ? "Google Gemini" : "Anthropic Claude"}</strong>
            <span className={chaves[p] ? "text-violeta-700" : "text-red-700"}>
              {chaves[p] ? "chave configurada" : `sem chave (${p === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY"})`}
            </span>
          </p>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-extrabold tracking-tight text-tinta">Ordem dos modelos</h2>
        <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
          {USOS.map(({ uso, nome, variavel }) => {
            const ativos = alvosDoUso(uso);
            const configurada = lerLista(process.env[variavel] ?? "");
            return (
              <li key={uso} className="space-y-2 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-tinta">{nome}</p>
                  <p className="text-xs text-slate-500">
                    esforço {esforcoDoUso(uso)} · {configurada.length ? `definido em ${variavel}` : `padrão (defina ${variavel} para mudar)`}
                  </p>
                </div>
                {ativos.length ? (
                  <p className="flex flex-wrap items-center gap-1.5 text-sm">
                    {ativos.map((a, i) => (
                      <span key={`${a.provedor}:${a.modelo}`} className="inline-flex items-center gap-1.5">
                        {i > 0 && <ArrowRight className="size-3.5 text-slate-400" />}
                        <span className={`rounded-full px-2.5 py-1 font-mono text-xs ${i === 0 ? "bg-lima text-tinta" : "bg-slate-100 text-slate-700"}`}>
                          {a.modelo}
                        </span>
                        {i > 0 && <span className="text-xs text-slate-500">reserva</span>}
                      </span>
                    ))}
                  </p>
                ) : (
                  <p className="text-sm text-red-700">Nenhum provedor com chave para este uso: a IA não vai funcionar.</p>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-slate-500">
          Exemplo na Vercel: <code className="rounded bg-slate-100 px-1">IA_CORRECAO=gemini:gemini-3.6-flash,anthropic:claude-haiku-5-5</code>.
          Mudou a variável? Faça um redeploy.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-extrabold tracking-tight text-tinta">Uso e custo estimado</h2>
          <nav className="flex gap-1 text-sm" aria-label="Período">
            {PERIODOS.map((p) => (
              <Link
                key={p}
                href={`/admin/ia?dias=${p}`}
                aria-current={p === dias ? "page" : undefined}
                className={`rounded-full px-3 py-1 font-semibold ${p === dias ? "bg-tinta text-white" : "text-tinta hover:bg-lima"}`}
              >
                {p} dias
              </Link>
            ))}
          </nav>
        </div>
        {linhas.length === 0 ? (
          <p className="rounded-2xl border-2 border-tinta bg-white p-6 text-center text-sm text-slate-600">Nenhum uso de IA no período.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border-2 border-tinta bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 text-left text-xs text-slate-500">
                <tr>
                  <th className="p-3">Modelo</th>
                  <th className="p-3">Uso</th>
                  <th className="p-3 text-right">Chamadas</th>
                  <th className="p-3 text-right">Tokens (entrada / saída)</th>
                  <th className="p-3 text-right">Custo estimado</th>
                  <th className="p-3 text-right">Por chamada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linhas.map((l) => (
                  <tr key={`${l.modelo}-${l.tipo}`}>
                    <td className="p-3 font-mono text-xs">{l.modelo}</td>
                    <td className="p-3">{NOME_TIPO[l.tipo] ?? l.tipo}</td>
                    <td className="p-3 text-right">{milhar(l.chamadas)}</td>
                    <td className="p-3 text-right text-slate-600">
                      {milhar(l.uso.entrada)} / {milhar(l.uso.saida)}
                    </td>
                    <td className="p-3 text-right font-semibold">{l.custo === null ? "—" : dolares(l.custo)}</td>
                    <td className="p-3 text-right text-slate-600">{l.custo === null ? "—" : dolares(l.custo / Math.max(l.chamadas, 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-500">
          Estimativa pela tabela de preços dos provedores (em dólar; lotes com 50% de desconto). O valor exato está no painel de
          cada provedor. Os Gemini Flash têm preço de lançamento até 31/12/2026 e dobram em 2027.
        </p>
      </section>
    </div>
  );
}
