"use client";

import { useActionState } from "react";
import { botaoPrimario, campo } from "@/components/admin-ui";
import type { EstadoAfiliado } from "./actions";

type Inicial = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  documento: string | null;
  codigo: string;
  cupom: string | null;
  comissao_pct: number;
  desconto_pct: number;
  ativo: boolean;
};

/** Cadastro e edição do afiliado (link, cupom, % de comissão e de desconto). */
export function FormularioAfiliado({
  acao,
  inicial,
}: {
  acao: (estado: EstadoAfiliado, formData: FormData) => Promise<EstadoAfiliado>;
  inicial?: Inicial;
}) {
  const [estado, enviar, enviando] = useActionState(acao, {});
  const rotulo = "block space-y-1 text-sm font-semibold text-tinta";
  return (
    <form action={enviar} className="space-y-4">
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={rotulo}>
          Nome
          <input name="nome" required defaultValue={inicial?.nome} className={campo} />
        </label>
        <label className={rotulo}>
          E-mail (login da área de parceiros)
          <input name="email" type="email" required defaultValue={inicial?.email} readOnly={Boolean(inicial)} className={`${campo} read-only:bg-slate-50`} />
        </label>
        <label className={rotulo}>
          WhatsApp
          <input name="telefone" defaultValue={inicial?.telefone ?? ""} placeholder="(11) 98765-4321" className={campo} />
        </label>
        <label className={rotulo}>
          CPF ou CNPJ
          <input name="documento" defaultValue={inicial?.documento ?? ""} className={campo} />
        </label>
        <label className={rotulo}>
          Código do link
          <input name="codigo" defaultValue={inicial?.codigo} placeholder="dra-ana (vazio: gera pelo nome)" className={campo} />
          <span className="block text-xs font-normal text-slate-500">odontolab.online/r/código</span>
        </label>
        <label className={rotulo}>
          Cupom de desconto
          <input name="cupom" defaultValue={inicial?.cupom ?? ""} placeholder="DRAANA10" className={`${campo} uppercase`} />
        </label>
        <label className={rotulo}>
          Comissão (% de cada pagamento)
          <input name="comissao_pct" inputMode="decimal" required defaultValue={inicial?.comissao_pct ?? 20} className={campo} />
        </label>
        <label className={rotulo}>
          Desconto do cupom (% da 1ª cobrança)
          <input name="desconto_pct" inputMode="decimal" required defaultValue={inicial?.desconto_pct ?? 10} className={campo} />
        </label>
      </div>
      {inicial && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="ativo" defaultChecked={inicial.ativo} className="size-4 accent-tinta" />
          Ativo (pausado: o link e o cupom param de valer e ele não acessa a área)
        </label>
      )}
      {estado.erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{estado.erro}</p>}
      {estado.mensagem && <p className="rounded-xl bg-violeta-50 p-3 text-sm text-violeta-900">{estado.mensagem}</p>}
      <button disabled={enviando} className={botaoPrimario}>
        {enviando ? "Salvando…" : inicial ? "Salvar" : "Cadastrar e enviar acesso"}
      </button>
    </form>
  );
}
