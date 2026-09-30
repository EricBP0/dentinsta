import { obterSessao } from "@/lib/auth";
import { gerarPdfCertificado } from "@/lib/certificado/pdf";
import { responsavelCertificado } from "@/lib/certificado/texto";
import { gerarSlug } from "@/lib/slug";

type Certificado = {
  nome_aluno: string;
  disciplina_nome: string;
  carga_horaria_h: number;
  codigo_validacao: string;
  emitido_em: string;
};

export async function GET(request: Request, { params }: RouteContext<"/aluno/certificados/[id]/pdf">) {
  const { id } = await params;
  const { supabase, perfil } = await obterSessao();
  if (!perfil) return new Response("login necessário", { status: 401 });

  // O RLS só devolve certificados do próprio aluno (ou para a equipe).
  const { data: certificado } = await supabase
    .from("certificados")
    .select("nome_aluno, disciplina_nome, carga_horaria_h, codigo_validacao, emitido_em")
    .eq("id", id)
    .maybeSingle<Certificado>();
  if (!certificado) return new Response("certificado não encontrado", { status: 404 });

  const base = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const pdf = await gerarPdfCertificado({
    ...responsavelCertificado(),
    nomeAluno: certificado.nome_aluno,
    disciplina: certificado.disciplina_nome,
    cargaHoraria: certificado.carga_horaria_h,
    emitidoEm: new Date(certificado.emitido_em),
    codigo: certificado.codigo_validacao,
    urlValidacao: `${base}/certificado/${certificado.codigo_validacao}`,
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-${gerarSlug(certificado.disciplina_nome)}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
