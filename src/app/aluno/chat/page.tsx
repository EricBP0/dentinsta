import { MessageCircle, Plus } from "lucide-react";
import Link from "next/link";
import { AreaBloqueada } from "@/components/cadeado";
import { temModulo } from "@/lib/acesso";
import { exigirLogin } from "@/lib/auth";
import { carregarAcesso } from "@/lib/catalogo";
import { limiteDiarioChat } from "@/lib/ia/chat";
import { inicioDoDia } from "@/lib/ia/chat-cota";
import { apagarConversa } from "./actions";
import { Chat } from "./chat";
import { botaoEscuro, CabecalhoPagina } from "@/components/sistema";

type Conversa = { id: string; titulo: string; atualizado_em: string };
type Mensagem = { id: string; papel: "user" | "assistant"; conteudo: string };

export default async function PaginaChat({ searchParams }: PageProps<"/aluno/chat">) {
  const { supabase, perfil } = await exigirLogin();
  const acesso = await carregarAcesso(supabase, perfil);
  if (!temModulo(acesso, "chat", perfil.papel !== "aluno")) {
    return <AreaBloqueada modulo="chat" temAssinatura={Boolean(acesso)} />;
  }

  const { c } = await searchParams;
  const conversaId = typeof c === "string" ? c : null;
  const limite = limiteDiarioChat();

  const [{ data: conversas }, { data: mensagens }, { count: usadas }] = await Promise.all([
    supabase
      .from("chat_conversas")
      .select("id, titulo, atualizado_em")
      .order("atualizado_em", { ascending: false })
      .limit(30)
      .overrideTypes<Conversa[], { merge: false }>(),
    conversaId
      ? supabase
          .from("chat_mensagens")
          .select("id, papel, conteudo")
          .eq("conversa_id", conversaId)
          .order("criado_em")
          .overrideTypes<Mensagem[], { merge: false }>()
      : Promise.resolve({ data: [] as Mensagem[] }),
    supabase
      .from("uso_ia")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", perfil.id)
      .eq("tipo", "chat")
      .gte("criado_em", inicioDoDia().toISOString()),
  ]);

  const atual = (conversas ?? []).find((x) => x.id === conversaId);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="min-w-0 space-y-3">
        <Link
          href="/aluno/chat"
          className={`${botaoEscuro} w-full`}
        >
          <Plus className="size-4" /> Nova conversa
        </Link>
        {(conversas ?? []).length > 0 && (
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {(conversas ?? []).map((x) => (
              <Link
                key={x.id}
                href={`/aluno/chat?c=${x.id}`}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm lg:shrink ${
                  x.id === conversaId ? "bg-tinta font-semibold text-white" : "text-slate-700 hover:bg-white"
                }`}
              >
                <MessageCircle className="size-4 shrink-0" />
                <span className="max-w-48 truncate">{x.titulo}</span>
              </Link>
            ))}
          </nav>
        )}
      </aside>

      <section className="min-w-0 space-y-3">
        <CabecalhoPagina rotulo="Lab · Chat IA" titulo={atual?.titulo ?? "Chat de dúvidas"} descricao="Pergunte qualquer coisa de Odontologia.">
          {atual && (
            <form action={apagarConversa}>
              <input type="hidden" name="id" value={atual.id} />
              <button className="rounded-full border-2 border-white/60 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10">
                Apagar conversa
              </button>
            </form>
          )}
        </CabecalhoPagina>
        <Chat
          key={conversaId ?? "nova"}
          conversaId={conversaId}
          iniciais={(mensagens ?? []).map((m) => ({ id: m.id, papel: m.papel, conteudo: m.conteudo }))}
          restantes={Math.max(0, limite - (usadas ?? 0))}
          limite={limite}
        />
      </section>
    </div>
  );
}
