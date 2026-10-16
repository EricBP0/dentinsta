import { notFound } from "next/navigation";
import { TIPOS_PIX, type TipoPix } from "@/lib/afiliados";
import { carregarConferencia } from "@/lib/afiliados-conferencia";
import { exigirAdmin } from "@/lib/auth";
import { formatarData } from "@/lib/catalogo";
import { PLANOS } from "@/lib/planos";
import { formatarReais } from "@/lib/preco";
import { NIVEL, STATUS_SAQUE } from "../../status";
import { BotaoImprimir } from "./imprimir";

/** Relatório de conferência do saque, em formato para imprimir e assinar. */
export default async function RelatorioSaque({ params }: PageProps<"/admin/afiliados/saques/[id]/relatorio">) {
  const { id } = await params;
  const { perfil } = await exigirAdmin();
  const conf = await carregarConferencia(id);
  if (!conf) notFound();
  const { saque, afiliado, linhas, resultado, chaveRecente } = conf;
  const porId = new Map(resultado.itens.map((i) => [i.comissaoId, i]));
  const agora = new Date();

  return (
    <div className="mx-auto max-w-4xl space-y-6 bg-white p-6 text-sm text-slate-900 print:max-w-none print:p-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-violeta-700 uppercase">OdontoLab · Afiliados</p>
          <h1 className="text-2xl font-extrabold">Relatório de conferência de saque</h1>
          <p className="text-slate-600">
            Gerado em {agora.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} por {perfil.nome || perfil.email}
          </p>
        </div>
        <BotaoImprimir />
      </div>

      <table className="w-full border-collapse text-left">
        <tbody>
          {[
            ["Afiliado", `${afiliado.nome} (${afiliado.email})`],
            ["CPF/CNPJ", afiliado.documento ?? "não informado"],
            ["Chave Pix do pedido", `${TIPOS_PIX[saque.tipo_chave_pix as TipoPix] ?? saque.tipo_chave_pix}: ${saque.chave_pix}`],
            ["Pedido em", formatarData(saque.criado_em)],
            ["Situação", STATUS_SAQUE[saque.status]?.texto ?? saque.status],
            ["Valor pedido", formatarReais(saque.valor_centavos)],
          ].map(([rotulo, valor]) => (
            <tr key={rotulo} className="border-b border-slate-200">
              <th className="w-48 py-1.5 pr-3 font-semibold text-slate-600">{rotulo}</th>
              <td className="py-1.5">{valor}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-3 gap-3">
        {(["ok", "alerta", "bloqueio"] as const).map((n) => (
          <div key={n} className="rounded-lg border border-slate-300 p-3">
            <p className="text-xs text-slate-500">{NIVEL[n].texto}</p>
            <p className="text-lg font-bold">
              {resultado.totais[n].quantidade} · {formatarReais(resultado.totais[n].centavos)}
            </p>
          </div>
        ))}
      </div>
      {chaveRecente && <p className="font-semibold text-amber-800">⚠ Chave Pix alterada menos de 7 dias antes do pedido.</p>}

      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b-2 border-slate-900">
            <th className="py-1.5 pr-2">Cliente</th>
            <th className="py-1.5 pr-2">Plano</th>
            <th className="py-1.5 pr-2">Pagamento</th>
            <th className="py-1.5 pr-2 text-right">Comissão</th>
            <th className="py-1.5 pr-2">Conferência</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const r = porId.get(l.comissaoId)!;
            return (
              <tr key={l.comissaoId} className="border-b border-slate-200 align-top break-inside-avoid">
                <td className="py-1.5 pr-2">
                  {l.clienteNome}
                  <span className="block text-slate-500">{l.clienteEmail}</span>
                </td>
                <td className="py-1.5 pr-2">
                  {l.plano ? PLANOS[l.plano].nome : "?"} {l.ciclo}
                  <span className="block text-slate-500">{l.tipo === "renovacao" ? "renovação" : "1ª compra"}</span>
                </td>
                <td className="py-1.5 pr-2">
                  {formatarReais(l.valorBaseCentavos)} · {l.compraStatus}
                  <span className="block text-slate-500">{l.pagoEm ? formatarData(l.pagoEm) : "?"}</span>
                </td>
                <td className="py-1.5 pr-2 text-right font-semibold">
                  {formatarReais(l.valorCentavos)}
                  <span className="block font-normal text-slate-500">{l.comissaoPct.toLocaleString("pt-BR")}%</span>
                </td>
                <td className="py-1.5 pr-2">
                  <strong>{NIVEL[r.nivel].texto}</strong>
                  {r.motivos.map((m) => (
                    <span key={m} className="block text-slate-600">
                      {m}
                    </span>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-10 pt-10">
        {["Conferido por", "Aprovado por"].map((r) => (
          <div key={r} className="border-t border-slate-900 pt-1 text-xs text-slate-600">
            {r} · data: ____/____/______
          </div>
        ))}
      </div>
    </div>
  );
}
