import Link from "next/link";
import { AtualizarPeriodicamente } from "@/components/atualizar-periodicamente";
import { Confete, Movimento } from "@/components/movimento";
import { obterSessao } from "@/lib/auth";
import { PLANOS, type Plano } from "@/lib/planos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarAcessoPorEmail } from "./actions";

type Assinatura = { id: string; status: string; plano: Plano };

/**
 * Volta do checkout do Asaas. Quem pagou com conta nova chega já logado; quem
 * usou um e-mail que já tinha conta chega sem login e entra pela senha ou pelo link.
 */
export default async function PagamentoConcluido({ searchParams }: PageProps<"/pagamento/concluido">) {
  const params = await searchParams;
  const assinaturaId = typeof params.assinatura === "string" ? params.assinatura : null;
  const { supabase, perfil } = await obterSessao();

  if (!perfil) return <SemLogin assinaturaId={assinaturaId} enviado={params.enviado === "1"} />;

  const [{ data: assinatura }, { data: conta }] = await Promise.all([
    assinaturaId
      ? supabase
          .from("assinaturas")
          .select("id, status, plano")
          .eq("id", assinaturaId)
          .eq("usuario_id", perfil.id)
          .maybeSingle<Assinatura>()
      : Promise.resolve({ data: null }),
    supabase.from("perfis").select("senha_pendente").eq("id", perfil.id).maybeSingle<{ senha_pendente: boolean }>(),
  ]);

  const pago = assinatura?.status === "ativa" || assinatura?.status === "cancelada";
  const pendente = assinatura?.status === "pendente";
  const avisoSenha = conta?.senha_pendente && (
    <p className="rounded-2xl border-2 border-tinta bg-lima/40 p-3 text-sm text-tinta">
      Você vai receber em <strong>{perfil.email}</strong> um link para criar sua senha. Ela serve para entrar de outros
      aparelhos; neste aqui você já está dentro.
    </p>
  );

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      {pago ? (
        <Movimento>
          <div className="relative">
            <Confete quantidade={40} />
            <p className="text-4xl">🎉</p>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-tinta">Assinatura confirmada!</h1>
          <p className="text-slate-600">
            Seu plano {PLANOS[assinatura.plano].nome} já está liberado.
            {assinatura.plano === "duplo" && " Convide a segunda pessoa em Minha assinatura."} Bons estudos!
          </p>
          {avisoSenha}
          <Link href="/aluno" className="rounded-full bg-tinta px-6 py-3 font-bold text-white hover:bg-violeta">
            Começar a estudar
          </Link>
        </Movimento>
      ) : pendente ? (
        <>
          <h1 className="text-3xl font-extrabold tracking-tight text-tinta">Confirmando seu pagamento…</h1>
          <p className="text-slate-600">
            Pix e cartão costumam confirmar em poucos segundos. Esta página atualiza sozinha — e você também recebe o
            acesso automaticamente se fechar agora.
          </p>
          {avisoSenha}
          <AtualizarPeriodicamente segundos={4} />
          <Link href="/aluno" className="text-sm font-medium text-violeta-700 underline">
            Ir para a área do aluno
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-extrabold tracking-tight text-tinta">Pagamento não encontrado</h1>
          <p className="text-slate-600">Se você acabou de pagar, aguarde alguns minutos e confira na área do aluno.</p>
          <Link href="/aluno" className="text-sm font-medium text-violeta-700 underline">
            Ir para a área do aluno
          </Link>
        </>
      )}
    </main>
  );
}

/** Pagou com um e-mail que já tinha conta: entra com a senha ou recebe um link. */
async function SemLogin({ assinaturaId, enviado }: { assinaturaId: string | null; enviado: boolean }) {
  // Só confirma que existe; não mostra dados da conta para quem não está logado.
  const { data } = assinaturaId
    ? await criarClienteAdmin().from("assinaturas").select("status").eq("id", assinaturaId).maybeSingle<{ status: string }>()
    : { data: null };
  const proximo = encodeURIComponent("/aluno");
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-tinta">
        {data?.status === "ativa" ? "Pagamento confirmado!" : "Pagamento recebido!"}
      </h1>
      <p className="text-slate-600">
        Esse e-mail já tinha uma conta na OdontoLab. Entre com sua senha, ou receba um link de acesso no e-mail.
      </p>
      <Link href={`/entrar?proximo=${proximo}`} className="rounded-full bg-tinta px-6 py-3 font-bold text-white hover:bg-violeta">
        Entrar
      </Link>
      {assinaturaId &&
        (enviado ? (
          <p className="text-sm text-slate-600">Pronto! Se o e-mail estiver certo, o link chega em instantes.</p>
        ) : (
          <form action={enviarAcessoPorEmail}>
            <input type="hidden" name="assinatura" value={assinaturaId} />
            <button className="text-sm font-semibold text-violeta-700 underline">Enviar link de acesso para o meu e-mail</button>
          </form>
        ))}
    </main>
  );
}
