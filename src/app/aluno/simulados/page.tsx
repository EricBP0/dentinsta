import Link from "next/link";
import { AreaBloqueada } from "@/components/cadeado";
import { temModulo } from "@/lib/acesso";
import { exigirLogin } from "@/lib/auth";
import { carregarCatalogo, formatarData } from "@/lib/catalogo";
import { cotaMensal, inicioDoMes } from "@/lib/ia/cota";
import { NovoSimulado } from "./novo-simulado";
import { CabecalhoPagina } from "@/components/sistema";

type LinhaSimulado = {
  id: string;
  status: "em_andamento" | "finalizado";
  nota: number | null;
  criado_em: string;
  disciplinas: { nome: string };
  simulado_questoes: { count: number }[];
};

export default async function Simulados() {
  const { supabase, perfil } = await exigirLogin();
  const equipe = perfil.papel !== "aluno";

  const [{ acesso, disciplinas }, { data: simulados }, { count: usadas }] = await Promise.all([
    carregarCatalogo(supabase, perfil),
    supabase
      .from("simulados")
      .select("id, status, nota, criado_em, disciplinas(nome), simulado_questoes(count)")
      .eq("usuario_id", perfil.id)
      .order("criado_em", { ascending: false })
      .limit(30)
      .overrideTypes<LinhaSimulado[], { merge: false }>(),
    supabase
      .from("uso_ia")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", perfil.id)
      .eq("tipo", "correcao")
      .gte("criado_em", inicioDoMes().toISOString()),
  ]);

  const liberadas = disciplinas.filter((d) => d.situacao === "liberada");
  const temasPorDisciplina = await Promise.all(
    liberadas.map(async (d) => {
      const { data } = await supabase.rpc("temas_da_disciplina", { p_disciplina_id: d.id });
      return { id: d.id, nome: d.nome, temas: ((data ?? []) as { tema: string }[]).map((t) => t.tema) };
    }),
  );
  if (!temModulo(acesso, "simulados", equipe)) return <AreaBloqueada modulo="simulados" temAssinatura={Boolean(acesso)} />;
  const cota = cotaMensal();

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        rotulo="Lab · Treino"
        titulo="Simulados"
        descricao="Monte um simulado com questões do banco da sua disciplina."
      >
        <span className="rounded-full bg-tinta px-3 py-1 text-xs font-semibold text-lima">
          Correções por IA este mês: {usadas ?? 0} de {cota}
        </span>
      </CabecalhoPagina>

      <NovoSimulado disciplinas={temasPorDisciplina} iaAtiva />

      <section>
        <h2 className="mb-3 text-lg font-extrabold tracking-tight text-tinta">Seus simulados</h2>
        <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
          {(simulados ?? []).length === 0 && <li className="p-4 text-sm text-slate-600">Nenhum simulado ainda.</li>}
          {(simulados ?? []).map((s) => (
            <li key={s.id}>
              <Link href={`/aluno/simulados/${s.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-slate-50">
                <div>
                  <p className="font-medium text-slate-900">{s.disciplinas.nome}</p>
                  <p className="text-xs text-slate-500">
                    {formatarData(s.criado_em)} · {s.simulado_questoes[0]?.count ?? 0} questões
                  </p>
                </div>
                {s.status === "em_andamento" ? (
                  <span className="text-sm font-medium text-violeta-700">Continuar →</span>
                ) : s.nota === null ? (
                  <span className="text-sm text-slate-500">Corrigindo…</span>
                ) : (
                  <span className={`text-lg font-bold ${Number(s.nota) >= 6 ? "text-violeta-700" : "text-red-600"}`}>
                    {Number(s.nota).toFixed(1)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
