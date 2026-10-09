import Link from "next/link";
import { BotaoRenovar } from "@/components/cadeado";
import { Carrossel } from "@/components/catalogo/carrossel";
import { ThumbConteudo } from "@/components/catalogo/thumb-conteudo";
import { SurgirItem, SurgirLista } from "@/components/movimento";
import { iaAtiva } from "@/lib/acesso";
import { exigirLogin } from "@/lib/auth";
import { carregarCatalogo, formatarData } from "@/lib/catalogo";
import { thumbDaDisciplina } from "@/lib/thumbs";
import { CabecalhoPagina } from "@/components/sistema";

export default async function Catalogo() {
  const { supabase, perfil } = await exigirLogin();
  const { acesso, disciplinas } = await carregarCatalogo(supabase, perfil);
  const equipe = perfil.papel !== "aluno";

  const itensBloqueados = disciplinas
    .flatMap((d) => d.modulos.flatMap((m) => m.itens))
    .filter((i) => i.situacao === "renove").length;
  const disciplinasBloqueadas = disciplinas.filter((d) => d.situacao === "renove").length;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <CabecalhoPagina rotulo="Lab · Estudo" titulo="Disciplinas" descricao="Cada disciplina numa linha, com todos os conteúdos dela." />

        {!acesso && !equipe && (
          <div className="rounded-2xl border-2 border-tinta bg-violeta-50 p-4 text-sm text-violeta-900">
            Você ainda não tem acesso ao conteúdo. <Link href="/assinar" className="font-medium underline">Liberar acesso</Link>
          </div>
        )}

        {acesso && (
          <div className="flex flex-wrap gap-3 text-sm">
            {iaAtiva(acesso) ? (
              <span className="rounded-full border-2 border-tinta bg-lima px-3 py-1 font-semibold text-tinta">
                Novidades e IA liberadas até {formatarData(acesso.novidadesAte)}
              </span>
            ) : (
              <BotaoRenovar texto="Renove para usar a IA" />
            )}
          </div>
        )}

        {itensBloqueados > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-tinta bg-amber-50 p-4 text-sm text-amber-900">
            <span>
              {itensBloqueados} {itensBloqueados === 1 ? "novo conteúdo" : "novos conteúdos"}
              {disciplinasBloqueadas > 0 && ` e ${disciplinasBloqueadas} ${disciplinasBloqueadas === 1 ? "disciplina" : "disciplinas"}`} desde o seu acesso.
            </span>
            <BotaoRenovar />
          </div>
        )}
      </section>

      {disciplinas.length === 0 && <p className="text-slate-600">Nenhuma disciplina disponível ainda.</p>}

      <SurgirLista className="space-y-10">
        {disciplinas.map((d) => {
          const arte = thumbDaDisciplina(d.slug);
          const itens = d.modulos.flatMap((m) => m.itens);
          const pct = d.progresso.total ? Math.round((d.progresso.concluidos / d.progresso.total) * 100) : 0;
          return (
            <SurgirItem key={d.id} className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-tinta">
                    {d.situacao === "liberada" ? (
                      <Link href={`/aluno/disciplinas/${d.slug}`} className="hover:text-violeta-700">
                        {d.nome}
                      </Link>
                    ) : (
                      d.nome
                    )}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {itens.length} {itens.length === 1 ? "conteúdo" : "conteúdos"}
                    {d.periodo_sugerido && ` · ${d.periodo_sugerido}º período`}
                    {d.situacao === "liberada" && d.progresso.total > 0 && ` · ${pct}% concluído`}
                  </p>
                </div>
                {d.situacao === "liberada" && (
                  <Link href={`/aluno/disciplinas/${d.slug}`} className="text-sm font-medium text-violeta-700 hover:underline">
                    Ver disciplina →
                  </Link>
                )}
                {d.situacao === "em_breve" && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">Em breve</span>
                )}
                {d.situacao === "renove" && <BotaoRenovar />}
                {d.situacao === "sem_acesso" && (
                  <Link href="/assinar" className="text-sm font-medium text-violeta-700 underline">
                    Liberar acesso
                  </Link>
                )}
              </div>

              {itens.length > 0 && (
                <Carrossel rotulo={`Conteúdos de ${d.nome}`}>
                  {itens.map((item) => (
                    <ThumbConteudo
                      key={item.id}
                      arte={arte}
                      disciplina={d.nome}
                      titulo={item.titulo}
                      tipo={item.tipo}
                      concluido={item.concluido}
                      bloqueado={item.situacao !== "liberado"}
                      href={
                        item.situacao === "liberado"
                          ? `/aluno/itens/${item.id}`
                          : item.situacao === "renove"
                            ? "/renovar"
                            : "/assinar"
                      }
                    />
                  ))}
                </Carrossel>
              )}
            </SurgirItem>
          );
        })}
      </SurgirLista>
    </div>
  );
}
