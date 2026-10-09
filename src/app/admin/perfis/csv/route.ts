import { exigirAdmin } from "@/lib/auth";
import { PERFIS, PERGUNTAS, rotuloDaResposta } from "@/lib/perfil-cliente";
import { consultarPerfis, lerFiltros } from "../consulta";

const celula = (valor: unknown) => {
  // Texto livre do aluno não vira fórmula no Excel (=, +, -, @).
  const texto = String(valor ?? "").replace(/^[=+\-@\t\r]/, "'$&");
  return /[";\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
};

/** Exporta os perfis filtrados (separador ";" e BOM, para abrir direto no Excel). */
export async function GET(request: Request) {
  const { supabase } = await exigirAdmin();
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const [{ data: linhas }, { data: disciplinas }] = await Promise.all([
    consultarPerfis(supabase, lerFiltros(params)),
    supabase.from("disciplinas").select("id, nome").overrideTypes<{ id: string; nome: string }[], { merge: false }>(),
  ]);
  const nomes = Object.fromEntries((disciplinas ?? []).map((d) => [d.id, d.nome]));

  const cabecalho = [
    "Nome", "E-mail", "Perfil", "Nota do anual", "Aceita contato", "Etapa 1", "Etapa 2", "Etiquetas",
    ...PERGUNTAS.map((p) => `P${p.numero} ${p.texto}`),
    "Cidade", "Faculdade", "Área da especialização",
  ];
  const corpo = (linhas ?? []).map((l) => [
    l.perfis.nome,
    l.perfis.email,
    l.perfil ? PERFIS[l.perfil] : "",
    l.nota_anual,
    l.aceita_contato ? "sim" : "não",
    l.etapa1_em?.slice(0, 10),
    l.etapa2_em?.slice(0, 10),
    l.etiquetas.join(" "),
    ...PERGUNTAS.map((p) => (l.respostas[p.id] === undefined ? "" : rotuloDaResposta(p.id, l.respostas[p.id], nomes))),
    l.respostas.p3_cidade,
    l.respostas.p6_extra,
    l.respostas.p14_extra,
  ]);
  const csv = "﻿" + [cabecalho, ...corpo].map((linha) => linha.map(celula).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="perfis-odontolab.csv"`,
      "cache-control": "no-store",
    },
  });
}
