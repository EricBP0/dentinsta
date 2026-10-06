import { CircleCheck, CircleX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { dataPorExtenso, responsavelCertificado } from "@/lib/certificado/texto";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Validação de certificado", robots: { index: false } };

type Validacao = { nome_aluno: string; disciplina_nome: string; carga_horaria_h: number; emitido_em: string };

/** Página pública: qualquer pessoa confere se o certificado é autêntico pelo código. */
export default async function ValidarCertificado({ params }: PageProps<"/certificado/[codigo]">) {
  const { codigo } = await params;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("validar_certificado", { p_codigo: codigo.slice(0, 32) });
  const certificado = ((data ?? []) as Validacao[])[0];
  const { plataforma } = responsavelCertificado();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-16">
      <Link href="/" className="text-center text-xl font-bold text-violeta-800">
        {plataforma}
      </Link>
      {certificado ? (
        <div className="space-y-5 rounded-2xl border border-violeta-200 bg-white p-8 text-center shadow-sm">
          <CircleCheck className="mx-auto size-12 text-violeta-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Certificado válido</h1>
            <p className="text-sm text-slate-500">Código {codigo.toUpperCase()}</p>
          </div>
          <dl className="space-y-3 text-left text-sm">
            <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
              <dt className="text-slate-500">Aluno</dt>
              <dd className="text-right font-medium text-slate-900">{certificado.nome_aluno}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
              <dt className="text-slate-500">Disciplina</dt>
              <dd className="text-right font-medium text-slate-900">{certificado.disciplina_nome}</dd>
            </div>
            {certificado.carga_horaria_h > 0 && (
              <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                <dt className="text-slate-500">Carga horária</dt>
                <dd className="text-right font-medium text-slate-900">{certificado.carga_horaria_h} horas</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
              <dt className="text-slate-500">Emitido em</dt>
              <dd className="text-right font-medium text-slate-900">{dataPorExtenso(new Date(certificado.emitido_em))}</dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500">Certificado de curso livre, emitido pela plataforma {plataforma}.</p>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <CircleX className="mx-auto size-12 text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Certificado não encontrado</h1>
          <p className="text-sm text-slate-600">Confira se o código foi digitado corretamente.</p>
        </div>
      )}
    </main>
  );
}
