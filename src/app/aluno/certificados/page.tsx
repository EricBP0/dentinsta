import { Download, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { BarraProgresso } from "@/components/cadeado";
import { Confete, SurgirItem, SurgirLista } from "@/components/movimento";
import { Button } from "@/components/ui/button";
import { exigirLogin } from "@/lib/auth";
import { carregarCatalogo, formatarData } from "@/lib/catalogo";
import { emitirCertificado } from "./actions";

type Certificado = {
  id: string;
  disciplina_id: string;
  disciplina_nome: string;
  carga_horaria_h: number;
  codigo_validacao: string;
  emitido_em: string;
};

export default async function Certificados({ searchParams }: PageProps<"/aluno/certificados">) {
  const { erro, emitido } = await searchParams;
  const { supabase, perfil } = await exigirLogin();

  const [{ disciplinas }, { data }] = await Promise.all([
    carregarCatalogo(supabase, perfil),
    supabase
      .from("certificados")
      .select("id, disciplina_id, disciplina_nome, carga_horaria_h, codigo_validacao, emitido_em")
      .eq("usuario_id", perfil.id)
      .order("emitido_em", { ascending: false })
      .overrideTypes<Certificado[], { merge: false }>(),
  ]);
  const certificados = data ?? [];
  const jaEmitidas = new Set(certificados.map((c) => c.disciplina_id));
  const liberadas = disciplinas.filter((d) => d.situacao === "liberada" && !jaEmitidas.has(d.id));
  const prontas = liberadas.filter((d) => d.progresso.completo);
  const emAndamento = liberadas.filter((d) => !d.progresso.completo && d.progresso.total > 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-tinta">Certificados</h1>
        <p className="text-sm text-slate-600">
          Conclua todos os itens obrigatórios de uma disciplina para emitir o certificado.
        </p>
      </header>

      {typeof erro === "string" && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{erro}</p>
      )}
      {emitido === "1" && (
        <div className="relative rounded-xl border border-violeta-200 bg-violeta-50 p-4 text-sm text-violeta-900">
          <Confete />
          🎓 Certificado emitido! Baixe o PDF abaixo.
        </div>
      )}

      {prontas.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900">Prontos para emitir</h2>
          {prontas.map((d) => (
            <form
              key={d.id}
              action={emitirCertificado}
              className="flex flex-wrap items-end gap-3 rounded-2xl border-2 border-violeta-600 bg-white p-5"
            >
              <input type="hidden" name="disciplina_id" value={d.id} />
              <div className="flex-1 space-y-1">
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  <GraduationCap className="size-5 text-violeta-600" /> {d.nome}
                </p>
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-600">Nome completo, como deve aparecer no certificado</span>
                  <input
                    name="nome"
                    defaultValue={perfil.nome}
                    required
                    minLength={5}
                    maxLength={120}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-violeta-600 focus:outline-none"
                  />
                </label>
              </div>
              <Button size="lg" className="h-10 px-4">
                Emitir certificado
              </Button>
            </form>
          ))}
          <p className="text-xs text-slate-500">Depois de emitido, o nome não pode ser alterado no certificado.</p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Seus certificados</h2>
        {certificados.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Nenhum certificado emitido ainda.</p>
        ) : (
          <SurgirLista className="grid gap-3 sm:grid-cols-2">
            {certificados.map((c) => (
              <SurgirItem key={c.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violeta-50 text-violeta-700">
                    <GraduationCap className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{c.disciplina_nome}</p>
                    <p className="text-xs text-slate-500">
                      Emitido em {formatarData(c.emitido_em)}
                      {c.carga_horaria_h > 0 && ` · ${c.carga_horaria_h}h`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <a href={`/aluno/certificados/${c.id}/pdf`} target="_blank" rel="noopener">
                      <Download data-icon="inline-start" /> Baixar PDF
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/certificado/${c.codigo_validacao}`} target="_blank">
                      <ShieldCheck data-icon="inline-start" /> Página de validação
                    </Link>
                  </Button>
                </div>
                <p className="text-xs text-slate-500">Código: {c.codigo_validacao}</p>
              </SurgirItem>
            ))}
          </SurgirLista>
        )}
      </section>

      {emAndamento.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900">Em andamento</h2>
          <ul className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            {emAndamento.map((d) => (
              <li key={d.id}>
                <Link href={`/aluno/disciplinas/${d.slug}`} className="block space-y-1.5">
                  <span className="text-sm text-slate-900">{d.nome}</span>
                  <BarraProgresso feitos={d.progresso.concluidos} total={d.progresso.total} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
