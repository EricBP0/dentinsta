"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { exigirEquipe } from "@/lib/auth";
import { enviarLoteGeracao, sincronizarGeracoes, type Geracao } from "@/lib/ia/geracao/lote";
import { validarArquivos } from "@/lib/ia/geracao/material";
import { MAX_QUESTOES_POR_GERACAO } from "@/lib/ia/geracao/prompt";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export type PedidoGeracao = {
  disciplinaId: string;
  tipoMaterial: "conteudo" | "prova";
  arquivos: { caminho: string; nome: string; tipo: string; tamanho: number }[];
  texto: string;
  objetivas: number;
  discursivas: number;
  dificuldade: number | null;
  tema: string;
  instrucoes: string;
};

function inteiroEntre(valor: number, min: number, max: number) {
  return Number.isInteger(valor) && valor >= min && valor <= max;
}

export async function criarGeracao(pedido: PedidoGeracao): Promise<{ erro?: string; id?: string }> {
  const { supabase, perfil } = await exigirEquipe();

  if (!pedido.disciplinaId) return { erro: "Escolha a disciplina." };
  if (!pedido.arquivos.length && !pedido.texto.trim()) return { erro: "Envie um arquivo ou cole um texto." };
  if (pedido.arquivos.some((a) => !a.caminho.startsWith("geracoes/") || a.caminho.includes(".."))) {
    return { erro: "Arquivo inválido." };
  }
  const erroArquivos = validarArquivos(pedido.arquivos);
  if (erroArquivos) return { erro: erroArquivos };
  if (!inteiroEntre(pedido.objetivas, 0, MAX_QUESTOES_POR_GERACAO) || !inteiroEntre(pedido.discursivas, 0, 10)) {
    return { erro: "Quantidade de questões inválida." };
  }
  const total = pedido.objetivas + pedido.discursivas;
  if (total < 1 || total > MAX_QUESTOES_POR_GERACAO) {
    return { erro: `Peça entre 1 e ${MAX_QUESTOES_POR_GERACAO} questões por geração.` };
  }

  const { data: geracao, error } = await supabase
    .from("geracoes_questoes")
    .insert({
      disciplina_id: pedido.disciplinaId,
      criado_por: perfil.id,
      arquivos: pedido.arquivos,
      texto: pedido.texto.slice(0, 200_000),
      tipo_material: pedido.tipoMaterial === "prova" ? "prova" : "conteudo",
      config: {
        objetivas: pedido.objetivas,
        discursivas: pedido.discursivas,
        dificuldade: [1, 2, 3].includes(pedido.dificuldade ?? 0) ? pedido.dificuldade : null,
        tema: pedido.tema.trim().slice(0, 100),
        instrucoes: pedido.instrucoes.trim().slice(0, 2000),
      },
    })
    .select("*")
    .single<Geracao>();
  if (error || !geracao) return { erro: "Não foi possível registrar a geração." };

  // Montar o lote (baixar e converter o material) pode levar alguns segundos.
  after(async () => {
    try {
      await enviarLoteGeracao(geracao);
    } catch (erro) {
      console.error("Falha ao enviar lote de geração", { geracaoId: geracao.id, erro });
      await criarClienteAdmin()
        .from("geracoes_questoes")
        .update({
          status: "erro",
          erro: erro instanceof Error ? erro.message : "Falha ao enviar o material para a IA.",
          concluido_em: new Date().toISOString(),
        })
        .eq("id", geracao.id);
    }
  });

  revalidatePath("/admin/questoes/geracoes");
  return { id: geracao.id };
}

export async function verificarGeracoes() {
  await exigirEquipe();
  await sincronizarGeracoes();
  revalidatePath("/admin/questoes/geracoes");
}

export async function aprovarTodasDaGeracao(formData: FormData) {
  const { supabase } = await exigirEquipe();
  await supabase
    .from("questoes")
    .update({ status: "aprovada" })
    .eq("geracao_id", String(formData.get("geracao_id")))
    .eq("status", "rascunho");
  revalidatePath("/admin/questoes", "layout");
}
