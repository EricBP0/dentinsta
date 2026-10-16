import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FaixaCupom } from "@/components/cupom";
import { FormularioContato } from "@/components/formulario-contato";
import { afiliadoDaVisita } from "@/lib/afiliado-visita";
import { descontoCentavos } from "@/lib/afiliados";
import { Logo } from "@/components/marca/logo";
import { obterSessao } from "@/lib/auth";
import { contatoDoLead } from "@/lib/lead";
import { textoParam } from "@/lib/listagem";
import { PARCELAS_ANUAL } from "@/lib/pagamento/ofertas";
import { montarEscolha, nomeDaEscolha } from "@/lib/planos";
import { formatarReais } from "@/lib/preco";
import { pagarSemConta } from "../actions";

/** Pagar sem conta: só nome, e-mail e WhatsApp antes do checkout. */
export default async function DadosParaPagar({ searchParams }: PageProps<"/assinar/dados">) {
  const params = await searchParams;
  const modulos = ([] as string[]).concat(params.modulos ?? []);
  const plano = textoParam(params.plano);
  const ciclo = textoParam(params.ciclo);
  const modalidade = textoParam(params.modalidade) === "parcelado" ? "parcelado" : "a_vista";
  const escolha = montarEscolha(plano, ciclo, modulos);
  if (!escolha) redirect("/assinar");

  const consulta = new URLSearchParams({ plano: escolha.plano, ciclo: escolha.ciclo, seguir: "1" });
  modulos.forEach((m) => consulta.append("modulos", m));
  const voltar = `/assinar/escolher?${consulta}`;
  const { perfil } = await obterSessao();
  if (perfil) redirect(voltar);

  const [lead, visita] = await Promise.all([contatoDoLead(), afiliadoDaVisita()]);
  // Cupom: desconto só na primeira cobrança.
  const desconto = visita?.cupom ? descontoCentavos(escolha.valorCentavos, visita.descontoPct) : 0;
  const primeira = escolha.valorCentavos - desconto;
  const preco =
    escolha.ciclo === "mensal"
      ? desconto
        ? `${formatarReais(primeira)} no 1º mês e ${formatarReais(escolha.valorCentavos)}/mês depois, no cartão`
        : `${formatarReais(escolha.valorCentavos)}/mês no cartão`
      : modalidade === "parcelado"
        ? `${PARCELAS_ANUAL}x ${formatarReais(Math.ceil(primeira / PARCELAS_ANUAL))} sem juros no cartão`
        : `${formatarReais(primeira)} à vista (Pix ou cartão)`;
  const aqui = new URLSearchParams({ plano: escolha.plano, ciclo: escolha.ciclo, modalidade });
  modulos.forEach((m) => aqui.append("modulos", m));

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 py-12">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="OdontoLab — início">
          <Logo />
        </Link>
        <Link href={voltar} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-tinta">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </div>

      <div className="space-y-5 rounded-3xl border-2 border-tinta bg-white p-6 shadow-[6px_6px_0_0_var(--color-lima)]">
        <div className="space-y-1">
          <p className="rotulo text-[11px] font-semibold text-violeta-700">{nomeDaEscolha(escolha)}</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-tinta">Falta pouco</h1>
          <p className="text-sm text-slate-600">
            {preco}. Depois do pagamento você já entra na plataforma e recebe um e-mail para criar sua senha.
          </p>
        </div>
        <FaixaCupom voltar={`/assinar/dados?${aqui}`} escolha={escolha} />
        <FormularioContato
          acao={pagarSemConta}
          ocultos={{ plano: escolha.plano, ciclo: escolha.ciclo, modalidade, modulos }}
          inicial={lead ?? undefined}
          botao="Ir para o pagamento"
          enviandoTexto="Abrindo o pagamento…"
        />
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Lock className="size-3.5" /> Pagamento seguro pelo Asaas
        </p>
      </div>

      <p className="text-center text-sm text-slate-600">
        Já tem conta?{" "}
        <Link href={`/entrar?proximo=${encodeURIComponent(voltar)}`} className="font-semibold text-violeta-700 underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
