import { Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { botaoPerigo, botaoPrimario, botaoSecundario, campo, Selo } from "@/components/admin-ui";
import { CabecalhoPagina } from "@/components/sistema";
import { TIPOS_PIX, type TipoPix } from "@/lib/afiliados";
import { carregarConferencia } from "@/lib/afiliados-conferencia";
import { exigirAdmin } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import { PLANOS } from "@/lib/planos";
import { formatarReais } from "@/lib/preco";
import { aprovarSaque, marcarSaqueFalhou, marcarSaquePago, recusarSaque } from "../../actions";
import { NIVEL, STATUS_SAQUE } from "../status";

const AVISOS: Record<string, string> = {
  aprovado: "Saque aprovado e Pix enviado ao Asaas. A confirmação chega pelo webhook.",
  recusado: "Saque recusado. As comissões não bloqueadas voltaram ao saldo do afiliado.",
  pix_falhou: "O Asaas recusou o Pix. As comissões voltaram ao saldo do afiliado; veja o motivo abaixo.",
  pago: "Saque marcado como pago.",
  falhou: "Saque marcado como falhou. As comissões voltaram ao saldo do afiliado.",
  ja_analisado: "Esse saque já tinha sido analisado.",
  erro: "Não foi possível analisar o saque. Tente de novo.",
};


/** Análise do saque: conferência automática, relatório para imprimir e Pix. */
export default async function AnaliseSaque({ params, searchParams }: PageProps<"/admin/afiliados/saques/[id]">) {
  const { id } = await params;
  const { aviso } = await searchParams;
  await exigirAdmin();
  const conf = await carregarConferencia(id);
  if (!conf) notFound();
  const { saque, afiliado, linhas, resultado, chaveRecente } = conf;
  const aberto = saque.status === "solicitado";
  const porId = new Map(resultado.itens.map((i) => [i.comissaoId, i]));
  const somaLinhas = linhas.reduce((s, l) => s + l.valorCentavos, 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/afiliados/saques" className="text-sm font-semibold text-slate-600 hover:text-tinta">
        ← Saques
      </Link>
      <CabecalhoPagina
        tom="tinta"
        rotulo={`Saque · ${STATUS_SAQUE[saque.status]?.texto ?? saque.status}`}
        titulo={`${afiliado.nome} · ${formatarReais(saque.valor_centavos)}`}
        descricao={`Pedido em ${formatarData(saque.criado_em)} · Pix ${TIPOS_PIX[saque.tipo_chave_pix as TipoPix] ?? saque.tipo_chave_pix}: ${saque.chave_pix}`}
      >
        <Link
          href={`/admin/afiliados/saques/${saque.id}/relatorio`}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-full border-2 border-lima px-4 py-2 text-sm font-bold text-lima hover:bg-lima hover:text-tinta"
        >
          <Printer className="size-4" /> Relatório para imprimir
        </Link>
      </CabecalhoPagina>

      {typeof aviso === "string" && AVISOS[aviso] && (
        <p className="rounded-2xl border-2 border-tinta bg-sky-50 p-3 text-sm text-sky-900">{AVISOS[aviso]}</p>
      )}
      {saque.motivo && <p className="rounded-2xl border-2 border-tinta bg-amber-50 p-3 text-sm text-amber-900">{saque.motivo}</p>}

      <section className="grid gap-3 sm:grid-cols-3">
        {(["ok", "alerta", "bloqueio"] as const).map((n) => (
          <div key={n} className="rounded-2xl border-2 border-tinta bg-white p-4">
            <p className="text-xs text-slate-500">{{ ok: "Conferidas OK", alerta: "Com alerta (decida)", bloqueio: "Bloqueadas (não pagar)" }[n]}</p>
            <p className="text-2xl font-extrabold text-tinta">{resultado.totais[n].quantidade}</p>
            <p className="text-xs text-slate-500">{formatarReais(resultado.totais[n].centavos)}</p>
          </div>
        ))}
      </section>

      {(chaveRecente || !afiliado.ativo || (aberto && somaLinhas !== saque.valor_centavos)) && (
        <ul className="space-y-1 rounded-2xl border-2 border-tinta bg-amber-50 p-4 text-sm text-amber-900">
          {chaveRecente && <li>⚠ A chave Pix foi alterada menos de 7 dias antes do pedido. Confirme com o afiliado por outro canal.</li>}
          {!afiliado.ativo && <li>⚠ O afiliado está pausado.</li>}
          {aberto && somaLinhas !== saque.valor_centavos && (
            <li>⚠ O valor pedido ({formatarReais(saque.valor_centavos)}) difere das comissões no saque ({formatarReais(somaLinhas)}): alguma saiu depois do pedido.</li>
          )}
        </ul>
      )}

      <form action={aprovarSaque} className="space-y-4">
        <input type="hidden" name="saque_id" value={saque.id} />
        <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-tinta bg-white">
          {linhas.length === 0 && <li className="p-4 text-sm text-slate-600">Nenhuma comissão neste saque.</li>}
          {linhas.map((l) => {
            const r = porId.get(l.comissaoId)!;
            return (
              <li key={l.comissaoId} className="flex flex-wrap items-start gap-3 p-4 text-sm">
                {aberto && (
                  <input
                    type="checkbox"
                    name="comissoes"
                    value={l.comissaoId}
                    defaultChecked={r.nivel === "ok"}
                    disabled={r.nivel === "bloqueio"}
                    aria-label={`Pagar comissão de ${l.clienteNome}`}
                    className="mt-1 size-4 accent-tinta"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {l.clienteNome} <span className="font-normal text-slate-500">· {l.clienteEmail}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {l.plano ? PLANOS[l.plano].nome : "?"} {l.ciclo} · {l.tipo === "renovacao" ? "renovação" : "1ª compra"} · pagamento{" "}
                    {formatarReais(l.valorBaseCentavos)} ({l.compraStatus}) em {l.pagoEm ? formatarData(l.pagoEm) : "?"} · liberada em{" "}
                    {formatarData(l.liberadaEm)}
                  </p>
                  {r.motivos.length > 0 && (
                    <ul className="mt-1 list-disc pl-4 text-xs text-amber-800">
                      {r.motivos.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-tinta">{formatarReais(l.valorCentavos)}</p>
                  <Selo status={NIVEL[r.nivel].selo} texto={NIVEL[r.nivel].texto} />
                </div>
              </li>
            );
          })}
        </ul>
        {aberto && (
          <div className="flex flex-wrap items-center gap-3">
            <button className={botaoPrimario}>Aprovar as marcadas e enviar o Pix</button>
            <p className="text-xs text-slate-500">
              Bloqueadas são canceladas; desmarcadas voltam ao saldo do afiliado. A conferência roda de novo na hora de aprovar.
            </p>
          </div>
        )}
      </form>

      {aberto && (
        <form action={recusarSaque} className="flex flex-wrap items-end gap-2 rounded-2xl border-2 border-slate-200 bg-white p-4">
          <input type="hidden" name="saque_id" value={saque.id} />
          <label className="min-w-64 flex-1 space-y-1 text-sm font-semibold text-tinta">
            Recusar o saque (motivo para o afiliado)
            <input name="motivo" placeholder="Ex.: confirmando dados do cliente" className={campo} />
          </label>
          <button className={botaoPerigo}>Recusar</button>
        </form>
      )}

      {saque.status === "transferindo" && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-tinta bg-white p-4 text-sm">
          <span className="flex-1 text-slate-600">
            Pix enviado ao Asaas{saque.transferencia_id && ` (${saque.transferencia_id})`}. Se o webhook não chegar, confirme no painel do Asaas e marque aqui.
          </span>
          <form action={marcarSaquePago}>
            <input type="hidden" name="saque_id" value={saque.id} />
            <button className={botaoSecundario}>Marcar como pago</button>
          </form>
          <form action={marcarSaqueFalhou}>
            <input type="hidden" name="saque_id" value={saque.id} />
            <button className={botaoPerigo}>Marcar como falhou</button>
          </form>
        </div>
      )}
    </div>
  );
}
