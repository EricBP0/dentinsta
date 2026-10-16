import "server-only";
import { COLUNAS_AFILIADO, type Afiliado } from "@/lib/afiliado-conta";
import { conferirSaque, type ClienteIndicado, type ItemConferencia, type ResultadoConferencia } from "@/lib/afiliados";
import type { Ciclo, Plano } from "@/lib/planos";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export type Saque = {
  id: string;
  afiliado_id: string;
  valor_centavos: number;
  status: "solicitado" | "transferindo" | "pago" | "falhou" | "recusado";
  chave_pix: string;
  tipo_chave_pix: string;
  conferencia: ResultadoConferencia | null;
  analisado_em: string | null;
  motivo: string | null;
  transferencia_id: string | null;
  pago_em: string | null;
  criado_em: string;
};

export type LinhaRelatorio = ItemConferencia & {
  clienteNome: string;
  plano: Plano | null;
  ciclo: Ciclo | null;
  tipo: "compra" | "renovacao" | null;
};

type Comissao = {
  id: string;
  status: string;
  valor_centavos: number;
  valor_base_centavos: number;
  comissao_pct: number;
  liberada_em: string;
  cliente_id: string;
  compra_id: string;
};
type Compra = {
  id: string;
  usuario_id: string;
  status: string;
  pago_em: string | null;
  gateway_cliente_id: string | null;
  assinatura_id: string | null;
  plano: Plano | null;
  ciclo: Ciclo | null;
  tipo: "compra" | "renovacao";
};

/**
 * Junta tudo o que a conferência precisa (comissões do saque, pagamentos,
 * assinaturas, clientes e o histórico do afiliado) e confere. Usado na tela,
 * no relatório impresso e de novo na hora de aprovar.
 */
export async function carregarConferencia(saqueId: string, agora: Date = new Date()) {
  const admin = criarClienteAdmin();
  const { data: saque } = await admin
    .from("saques")
    .select("id, afiliado_id, valor_centavos, status, chave_pix, tipo_chave_pix, conferencia, analisado_em, motivo, transferencia_id, pago_em, criado_em")
    .eq("id", saqueId)
    .maybeSingle<Saque>();
  if (!saque) return null;

  const [{ data: afiliado }, { data: doSaque }, { data: todas }] = await Promise.all([
    admin.from("afiliados").select(COLUNAS_AFILIADO).eq("id", saque.afiliado_id).single<Afiliado>(),
    admin
      .from("comissoes")
      .select("id, status, valor_centavos, valor_base_centavos, comissao_pct, liberada_em, cliente_id, compra_id")
      .eq("saque_id", saqueId)
      .overrideTypes<Comissao[], { merge: false }>(),
    admin.from("comissoes").select("cliente_id").eq("afiliado_id", saque.afiliado_id).overrideTypes<{ cliente_id: string }[], { merge: false }>(),
  ]);
  if (!afiliado) return null;
  // Saque já analisado: as comissões que saíram dele não aparecem mais por saque_id.
  const comissoes = doSaque ?? [];
  const clientesIds = [...new Set((todas ?? []).map((c) => c.cliente_id))];
  const usuariosCompras = [...clientesIds, ...(afiliado.usuario_id ? [afiliado.usuario_id] : [])];

  const [{ data: compras }, { data: perfis }] = await Promise.all([
    usuariosCompras.length
      ? admin
          .from("compras")
          .select("id, usuario_id, status, pago_em, gateway_cliente_id, assinatura_id, plano, ciclo, tipo")
          .in("usuario_id", usuariosCompras)
          .overrideTypes<Compra[], { merge: false }>()
      : Promise.resolve({ data: [] as Compra[] }),
    clientesIds.length
      ? admin
          .from("perfis")
          .select("id, nome, email, telefone")
          .in("id", clientesIds)
          .overrideTypes<{ id: string; nome: string; email: string; telefone: string | null }[], { merge: false }>()
      : Promise.resolve({ data: [] as { id: string; nome: string; email: string; telefone: string | null }[] }),
  ]);
  const assinaturasIds = [...new Set((compras ?? []).map((c) => c.assinatura_id).filter((id): id is string => Boolean(id)))];
  const { data: assinaturas } = assinaturasIds.length
    ? await admin
        .from("assinaturas")
        .select("id, status, cancelada_em")
        .in("id", assinaturasIds)
        .overrideTypes<{ id: string; status: string; cancelada_em: string | null }[], { merge: false }>()
    : { data: [] };

  const compraPorId = new Map((compras ?? []).map((c) => [c.id, c]));
  const perfilPorId = new Map((perfis ?? []).map((p) => [p.id, p]));
  const assinaturaPorId = new Map((assinaturas ?? []).map((a) => [a.id, a]));
  const gatewaysDe = (usuarioId: string) =>
    [...new Set((compras ?? []).filter((c) => c.usuario_id === usuarioId && c.gateway_cliente_id).map((c) => c.gateway_cliente_id!))];

  const linhas: LinhaRelatorio[] = comissoes.map((c) => {
    const compra = compraPorId.get(c.compra_id);
    const cliente = perfilPorId.get(c.cliente_id);
    const assinatura = compra?.assinatura_id ? assinaturaPorId.get(compra.assinatura_id) : undefined;
    return {
      comissaoId: c.id,
      comissaoStatus: c.status,
      valorCentavos: c.valor_centavos,
      valorBaseCentavos: c.valor_base_centavos,
      comissaoPct: Number(c.comissao_pct),
      liberadaEm: c.liberada_em,
      compraStatus: compra?.status ?? "não encontrado",
      pagoEm: compra?.pago_em ?? null,
      clienteId: c.cliente_id,
      clienteEmail: cliente?.email ?? "",
      clienteTelefone: cliente?.telefone ?? null,
      clienteGatewayId: compra?.gateway_cliente_id ?? null,
      assinaturaStatus: assinatura?.status ?? null,
      canceladaEm: assinatura?.cancelada_em ?? null,
      clienteNome: cliente?.nome || cliente?.email || "Cliente",
      plano: compra?.plano ?? null,
      ciclo: compra?.ciclo ?? null,
      tipo: compra?.tipo ?? null,
    };
  });
  const clientes: ClienteIndicado[] = clientesIds.map((id) => ({
    clienteId: id,
    telefone: perfilPorId.get(id)?.telefone ?? null,
    gatewayIds: gatewaysDe(id),
  }));
  const resultado = conferirSaque(
    linhas,
    {
      usuarioId: afiliado.usuario_id,
      email: afiliado.email,
      telefone: afiliado.telefone,
      gatewayIdsProprios: afiliado.usuario_id ? gatewaysDe(afiliado.usuario_id) : [],
    },
    clientes,
    agora,
  );
  // Chave Pix trocada pouco antes do pedido: pode ser conta invadida.
  const chaveRecente =
    afiliado.chave_pix_alterada_em !== null &&
    new Date(saque.criado_em).getTime() - new Date(afiliado.chave_pix_alterada_em).getTime() < 7 * 864e5;
  return { saque, afiliado, linhas, resultado, chaveRecente };
}
