import { MessageCircle, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { BotaoRenovar } from "@/components/cadeado";
import { podeCorrigirComIa } from "@/lib/acesso";
import { exigirLogin } from "@/lib/auth";
import { carregarAcesso } from "@/lib/catalogo";
import { limiteDiarioChat } from "@/lib/ia/chat";
import { inicioDoDia } from "@/lib/ia/chat-cota";
import { apagarConversa } from "./actions";
import { Chat } from "./chat";

type Conversa = { id: string; titulo: string; atualizado_em: string };
type Mensagem = { id: string; papel: "user" | "assistant"; conteudo: string };

export default async function PaginaChat({ searchParams }: PageProps<"/aluno/chat">) {
  const { supabase, perfil } = await exigirLogin();
  const acesso = await carregarAcesso(supabase, perfil);
  const liberado = podeCorrigirComIa(acesso, perfil.papel !== "aluno");

  if (!liberado) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-violeta-50 text-violeta-700">
          <Sparkles className="size-6" />
        </div>
        <h1 className="text-xl font-bold text-tinta">Tire dúvidas com a IA</h1>
        <p className="text-slate-600">
          Pergunte qualquer coisa de Odontologia e receba uma explicação na hora. O chat faz parte da IA da plataforma.
        </p>
        {acesso ? (
          <BotaoRenovar texto="Renove para usar o chat" />
        ) : (
          <Link href="/assinar" className="font-medium text-violeta-700 underline">
            Liberar acesso
          </Link>
        )}
      </div>
    );
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
          className="flex items-center justify-center gap-2 rounded-xl bg-violeta-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-violeta-800"
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
                  x.id === conversaId ? "bg-violeta-50 font-medium text-violeta-800" : "text-slate-600 hover:bg-slate-100"
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
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-tinta">{atual?.titulo ?? "Chat de dúvidas"}</h1>
            <p className="text-sm text-slate-600">Pergunte qualquer coisa de Odontologia.</p>
          </div>
          {atual && (
            <form action={apagarConversa}>
              <input type="hidden" name="id" value={atual.id} />
              <button className="text-xs text-slate-500 underline hover:text-red-700">Apagar conversa</button>
            </form>
          )}
        </header>
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
