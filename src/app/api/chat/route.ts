import { carregarAcesso } from "@/lib/catalogo";
import { temModulo } from "@/lib/acesso";
import { obterSessao } from "@/lib/auth";
import {
  MENSAGENS_DE_CONTEXTO,
  limiteDiarioChat,
  responderChat,
  tituloDaConversa,
  TAMANHO_MAXIMO_PERGUNTA,
  type MensagemChat,
} from "@/lib/ia/chat";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const RESPOSTA_RECUSADA =
  "Não consegui responder essa pergunta. Tente reformular com mais contexto de Odontologia.";

function erro(status: number, mensagem: string) {
  return Response.json({ erro: mensagem }, { status });
}

/**
 * Recebe uma pergunta e devolve a resposta em texto, aos poucos (streaming).
 * O id da conversa vai no cabeçalho X-Conversa-Id.
 */
export async function POST(request: Request) {
  const { supabase, perfil } = await obterSessao();
  if (!perfil) return erro(401, "Entre na sua conta para usar o chat.");

  const acesso = await carregarAcesso(supabase, perfil);
  if (!temModulo(acesso, "chat", perfil.papel !== "aluno")) {
    return erro(403, "O Chat IA não faz parte do seu plano. Veja os planos para liberar.");
  }

  const corpo = (await request.json().catch(() => null)) as { conversaId?: unknown; mensagem?: unknown } | null;
  const pergunta = typeof corpo?.mensagem === "string" ? corpo.mensagem.trim() : "";
  const conversaPedida = typeof corpo?.conversaId === "string" ? corpo.conversaId : null;
  if (!pergunta) return erro(400, "Escreva sua pergunta.");
  if (pergunta.length > TAMANHO_MAXIMO_PERGUNTA) {
    return erro(400, `A pergunta pode ter até ${TAMANHO_MAXIMO_PERGUNTA} caracteres.`);
  }

  const admin = criarClienteAdmin();

  // A conversa precisa ser do próprio aluno.
  let conversaId = conversaPedida;
  if (conversaId) {
    const { data } = await admin
      .from("chat_conversas")
      .select("id")
      .eq("id", conversaId)
      .eq("usuario_id", perfil.id)
      .maybeSingle();
    if (!data) return erro(404, "Conversa não encontrada.");
  }

  const limite = limiteDiarioChat();
  const { data: usoId, error: erroCota } = await supabase.rpc("reservar_pergunta_chat", { p_limite: limite });
  if (erroCota) return erro(500, "Não foi possível conferir seu limite agora. Tente de novo.");
  if (!usoId) return erro(429, `Você já fez as ${limite} perguntas de hoje. O limite renova à meia-noite.`);

  if (!conversaId) {
    const { data, error } = await admin
      .from("chat_conversas")
      .insert({ usuario_id: perfil.id, titulo: tituloDaConversa(pergunta) })
      .select("id")
      .single();
    if (error) {
      await admin.from("uso_ia").delete().eq("id", usoId);
      return erro(500, "Não foi possível abrir a conversa.");
    }
    conversaId = data.id as string;
  }

  const { data: anteriores } = await admin
    .from("chat_mensagens")
    .select("papel, conteudo")
    .eq("conversa_id", conversaId)
    .order("criado_em", { ascending: false })
    .limit(MENSAGENS_DE_CONTEXTO);
  // A conversa tem que começar com o aluno: descarta uma resposta solta no início.
  const historico: MensagemChat[] = ((anteriores ?? []) as MensagemChat[]).reverse();
  while (historico[0]?.papel === "assistant") historico.shift();
  historico.push({ papel: "user", conteudo: pergunta });

  await admin.from("chat_mensagens").insert({ conversa_id: conversaId, papel: "user", conteudo: pergunta });

  const conversa = conversaId;
  const codificador = new TextEncoder();
  const corpoResposta = new ReadableStream<Uint8Array>({
    async start(controle) {
      let texto = "";
      try {
        const resposta = responderChat(historico);
        for await (const pedaco of resposta.pedacos) {
          texto += pedaco;
          controle.enqueue(codificador.encode(pedaco));
        }
        const final = await resposta.fim;
        if (final.recusado && !texto) {
          texto = RESPOSTA_RECUSADA;
          controle.enqueue(codificador.encode(texto));
        }
        await Promise.all([
          admin.from("chat_mensagens").insert({ conversa_id: conversa, papel: "assistant", conteudo: texto || RESPOSTA_RECUSADA }),
          admin
            .from("uso_ia")
            .update({
              modelo: final.modelo,
              tokens_entrada: final.uso.entrada,
              tokens_saida: final.uso.saida,
              tokens_cache: final.uso.cache,
            })
            .eq("id", usoId),
          admin.from("chat_conversas").update({ atualizado_em: new Date().toISOString() }).eq("id", conversa),
        ]);
      } catch (e) {
        console.error("chat: falha ao responder", e);
        if (texto) {
          // Já respondeu parte: guarda o que chegou e conta a pergunta.
          await admin.from("chat_mensagens").insert({ conversa_id: conversa, papel: "assistant", conteudo: texto });
        } else {
          // Nada chegou: devolve a pergunta para a cota.
          await admin.from("uso_ia").delete().eq("id", usoId);
          controle.enqueue(codificador.encode("Tive um problema para responder agora. Tente de novo em instantes."));
        }
      } finally {
        controle.close();
      }
    },
  });

  return new Response(corpoResposta, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Conversa-Id": conversa,
    },
  });
}
