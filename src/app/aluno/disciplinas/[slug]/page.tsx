import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraProgresso, BotaoRenovar } from "@/components/cadeado";
import { CapaDisciplina } from "@/components/capa-disciplina";
import { exigirLogin } from "@/lib/auth";
import { carregarCatalogo } from "@/lib/catalogo";
import { NOME_TIPO_ITEM } from "@/lib/tipos";
import { CabecalhoPagina } from "@/components/sistema";

export default async function PaginaDisciplina({ params }: PageProps<"/aluno/disciplinas/[slug]">) {
  const { slug } = await params;
  const { supabase, perfil } = await exigirLogin();
  const { disciplinas } = await carregarCatalogo(supabase, perfil, { slug });
  const disciplina = disciplinas[0];
  if (!disciplina || disciplina.situacao === "em_breve") notFound();

  return (
    <div className="space-y-6">
      <Link href="/aluno/disciplinas" className="text-sm text-slate-600 hover:text-slate-900">
        ← Disciplinas
      </Link>
      <CabecalhoPagina rotulo="Lab · Disciplina" titulo={disciplina.nome} descricao={disciplina.descricao || undefined} />
      <header className="grid items-center gap-4 sm:grid-cols-[minmax(0,320px)_1fr]">
        {disciplina.capa_url && <CapaDisciplina src={disciplina.capa_url} nome={disciplina.nome} className="border-2 border-tinta" />}
        <div className="max-w-sm">
          <BarraProgresso feitos={disciplina.progresso.concluidos} total={disciplina.progresso.total} />
          {disciplina.progresso.completo && (
            <p className="mt-2 text-sm font-medium text-violeta-700">
              🎓 Você concluiu todos os itens obrigatórios!{" "}
              <Link href="/aluno/certificados" className="underline">
                Emitir certificado
              </Link>
            </p>
          )}
        </div>
      </header>

      {disciplina.modulos.map((modulo) => (
        <section key={modulo.id} className="rounded-2xl border-2 border-tinta bg-white">
          <h2 className="border-b border-slate-100 px-4 py-3 font-extrabold tracking-tight text-tinta">{modulo.titulo}</h2>
          <ul className="divide-y divide-slate-100">
            {modulo.itens.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center">{item.concluido ? "✅" : item.situacao === "liberado" ? "○" : "🔒"}</span>
                  <div>
                    {item.situacao === "liberado" ? (
                      <Link href={`/aluno/itens/${item.id}`} className="font-medium text-slate-900 hover:text-violeta-700">
                        {item.titulo}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-500">{item.titulo}</span>
                    )}
                    <p className="text-xs text-slate-500">
                      {NOME_TIPO_ITEM[item.tipo]}
                      {item.obrigatorio && " · obrigatório"}
                    </p>
                  </div>
                </div>
                {item.situacao === "renove" && <BotaoRenovar />}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
