"use server";

import { revalidatePath } from "next/cache";
import { exigirEquipe } from "@/lib/auth";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export async function responderContestacao(formData: FormData) {
  const { supabase } = await exigirEquipe();
  const id = String(formData.get("id"));
  const respostaId = String(formData.get("resposta_id"));
  const aceita = formData.get("decisao") === "aceita";
  const notaTexto = String(formData.get("nota_revisada") ?? "").replace(",", ".");
  const nota = notaTexto ? Number(notaTexto) : null;

  if (aceita) {
    if (nota === null || !Number.isFinite(nota) || nota < 0 || nota > 10) {
      throw new Error("Informe a nova nota (0 a 10) para aceitar a contestação.");
    }
    const { data: resposta, error } = await supabase
      .from("respostas")
      .update({ nota, corrigido_por: "professor", corrigido_em: new Date().toISOString() })
      .eq("id", respostaId)
      .select("simulado_id")
      .single<{ simulado_id: string }>();
    if (error || !resposta) throw new Error("Não foi possível atualizar a nota.");
    await criarClienteAdmin().rpc("atualizar_nota_simulado", { p_simulado_id: resposta.simulado_id });
  }

  const { error } = await supabase
    .from("contestacoes")
    .update({
      status: aceita ? "aceita" : "recusada",
      resposta_equipe: String(formData.get("resposta_equipe") ?? "").trim(),
      resolvido_em: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error("Não foi possível responder a contestação.");

  revalidatePath("/admin/contestacoes");
}
