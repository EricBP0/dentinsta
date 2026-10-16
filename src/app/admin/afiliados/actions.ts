"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizarCodigo, normalizarCupom, normalizarDocumento } from "@/lib/afiliados";
import { carregarConferencia } from "@/lib/afiliados-conferencia";
import { exigirAdmin } from "@/lib/auth";
import { normalizarTelefone } from "@/lib/cadastro";
import { contaDoAfiliado, enviarLinkDeSenha } from "@/lib/conta";
import { transferirPix } from "@/lib/pagamento/asaas";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export type EstadoAfiliado = { erro?: string; mensagem?: string };

function lerCampos(formData: FormData) {
  const texto = (nome: string) => String(formData.get(nome) ?? "").trim();
  const pct = (nome: string, max: number) => {
    const n = Number(texto(nome).replace(",", "."));
    return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 100) / 100 : null;
  };
  const telefone = texto("telefone");
  const documento = texto("documento");
  const cupom = texto("cupom");
  return {
    nome: texto("nome").replace(/\s+/g, " "),
    email: texto("email").toLowerCase(),
    telefone: telefone ? normalizarTelefone(telefone) : null,
    telefoneInvalido: Boolean(telefone) && !normalizarTelefone(telefone),
    documento: documento ? normalizarDocumento(documento) : null,
    documentoInvalido: Boolean(documento) && !normalizarDocumento(documento),
    codigo: normalizarCodigo(texto("codigo") || texto("nome")),
    cupom: cupom ? normalizarCupom(cupom) : null,
    cupomInvalido: Boolean(cupom) && !normalizarCupom(cupom),
    comissaoPct: pct("comissao_pct", 100),
    descontoPct: pct("desconto_pct", 90),
  };
}

function validar(c: ReturnType<typeof lerCampos>): string | null {
  if (c.nome.length < 2) return "Informe o nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email)) return "Informe um e-mail válido.";
  if (c.telefoneInvalido) return "WhatsApp inválido (use DDD).";
  if (c.documentoInvalido) return "CPF/CNPJ inválido.";
  if (!c.codigo) return "Código do link inválido (3 a 30 letras, números ou hífen).";
  if (c.cupomInvalido) return "Cupom inválido (3 a 20 letras ou números).";
  if (c.comissaoPct === null) return "Comissão deve ser entre 0 e 100%.";
  if (c.descontoPct === null) return "Desconto deve ser entre 0 e 90%.";
  return null;
}

function erroDeDuplicado(mensagem: string): string {
  if (mensagem.includes("afiliados_codigo_key")) return "Esse código de link já é de outro afiliado.";
  if (mensagem.includes("afiliados_cupom_key")) return "Esse cupom já é de outro afiliado.";
  if (mensagem.includes("afiliados_email_key")) return "Já existe um afiliado com esse e-mail.";
  if (mensagem.includes("afiliados_usuario_id_key")) return "Essa conta já é de outro afiliado.";
  return "Não foi possível salvar.";
}

/** Cadastra o afiliado, cria a conta de login e manda o e-mail para criar a senha. */
export async function criarAfiliado(_: EstadoAfiliado, formData: FormData): Promise<EstadoAfiliado> {
  await exigirAdmin();
  const c = lerCampos(formData);
  const erro = validar(c);
  if (erro) return { erro };

  let usuarioId: string;
  try {
    usuarioId = await contaDoAfiliado(c.email, c.nome);
  } catch (e) {
    console.error("Falha ao criar conta do afiliado", { e });
    return { erro: "Não foi possível criar a conta de login." };
  }
  const { data, error } = await criarClienteAdmin()
    .from("afiliados")
    .insert({
      usuario_id: usuarioId,
      nome: c.nome,
      email: c.email,
      telefone: c.telefone,
      documento: c.documento,
      codigo: c.codigo,
      cupom: c.cupom,
      comissao_pct: c.comissaoPct,
      desconto_pct: c.descontoPct,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { erro: erroDeDuplicado(error?.message ?? "") };
  await enviarLinkDeSenha(c.email);
  revalidatePath("/admin/afiliados");
  redirect(`/admin/afiliados/${data.id}?aviso=criado`);
}

export async function atualizarAfiliado(_: EstadoAfiliado, formData: FormData): Promise<EstadoAfiliado> {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  const c = lerCampos(formData);
  const erro = validar(c);
  if (erro) return { erro };
  const { error } = await criarClienteAdmin()
    .from("afiliados")
    .update({
      nome: c.nome,
      telefone: c.telefone,
      documento: c.documento,
      codigo: c.codigo,
      cupom: c.cupom,
      comissao_pct: c.comissaoPct,
      desconto_pct: c.descontoPct,
      ativo: formData.get("ativo") === "on",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { erro: erroDeDuplicado(error.message) };
  revalidatePath("/admin/afiliados", "layout");
  return { mensagem: "Afiliado salvo. A nova % vale para os próximos pagamentos." };
}

export async function reenviarAcesso(formData: FormData) {
  await exigirAdmin();
  const { data } = await criarClienteAdmin()
    .from("afiliados")
    .select("email")
    .eq("id", String(formData.get("id") ?? ""))
    .maybeSingle<{ email: string }>();
  if (data) await enviarLinkDeSenha(data.email);
  redirect(`/admin/afiliados/${formData.get("id")}?aviso=acesso`);
}

// -----------------------------------------------------------------------------
// Saques
// -----------------------------------------------------------------------------

/**
 * Aprova o saque: a conferência roda de novo agora. Bloqueios são cancelados
 * sempre; das demais, só as marcadas são pagas (o resto volta ao saldo). Depois
 * faz o Pix pelo Asaas; o resultado chega pelo webhook.
 */
export async function aprovarSaque(formData: FormData) {
  const { perfil } = await exigirAdmin();
  const saqueId = String(formData.get("saque_id") ?? "");
  const conf = await carregarConferencia(saqueId);
  if (!conf || conf.saque.status !== "solicitado") redirect(`/admin/afiliados/saques/${saqueId}?aviso=ja_analisado`);

  const marcadas = new Set(formData.getAll("comissoes").map(String));
  const canceladas = Object.fromEntries(
    conf.resultado.itens.filter((i) => i.nivel === "bloqueio").map((i) => [i.comissaoId, `Conferência: ${i.motivos.join("; ")}`]),
  );
  const aprovadas = conf.resultado.itens.filter((i) => i.nivel !== "bloqueio" && marcadas.has(i.comissaoId)).map((i) => i.comissaoId);

  const admin = criarClienteAdmin();
  const { data: valor, error } = await admin.rpc("analisar_saque", {
    p_saque_id: saqueId,
    p_aprovadas: aprovadas,
    p_canceladas: canceladas,
    p_conferencia: conf.resultado,
    p_admin: perfil.id,
    p_motivo: null,
  });
  if (error) {
    console.error("Falha ao analisar saque", { saqueId, error });
    redirect(`/admin/afiliados/saques/${saqueId}?aviso=erro`);
  }
  if (!valor) redirect(`/admin/afiliados/saques/${saqueId}?aviso=recusado`);

  try {
    const transferencia = await transferirPix({
      valorCentavos: Number(valor),
      chave: conf.saque.chave_pix,
      tipoChave: conf.saque.tipo_chave_pix,
      descricao: `OdontoLab · comissões de ${conf.afiliado.nome}`,
      saqueId,
    });
    await admin.from("saques").update({ transferencia_id: transferencia.id }).eq("id", saqueId);
    if (transferencia.status === "DONE") await admin.rpc("concluir_saque", { p_saque_id: saqueId, p_transferencia_id: transferencia.id });
  } catch (erro) {
    console.error("Falha no Pix do saque", { saqueId, erro });
    await admin.rpc("falhar_saque", { p_saque_id: saqueId, p_motivo: `Pix não enviado: ${(erro as Error).message}`.slice(0, 300) });
    redirect(`/admin/afiliados/saques/${saqueId}?aviso=pix_falhou`);
  }
  revalidatePath("/admin/afiliados", "layout");
  redirect(`/admin/afiliados/saques/${saqueId}?aviso=aprovado`);
}

/** Recusa o saque: bloqueios são cancelados; o resto volta ao saldo do afiliado. */
export async function recusarSaque(formData: FormData) {
  const { perfil } = await exigirAdmin();
  const saqueId = String(formData.get("saque_id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 500) || "Recusado na conferência";
  const conf = await carregarConferencia(saqueId);
  if (!conf || conf.saque.status !== "solicitado") redirect(`/admin/afiliados/saques/${saqueId}?aviso=ja_analisado`);
  const canceladas = Object.fromEntries(
    conf.resultado.itens.filter((i) => i.nivel === "bloqueio").map((i) => [i.comissaoId, `Conferência: ${i.motivos.join("; ")}`]),
  );
  await criarClienteAdmin().rpc("analisar_saque", {
    p_saque_id: saqueId,
    p_aprovadas: [],
    p_canceladas: canceladas,
    p_conferencia: conf.resultado,
    p_admin: perfil.id,
    p_motivo: motivo,
  });
  revalidatePath("/admin/afiliados", "layout");
  redirect(`/admin/afiliados/saques/${saqueId}?aviso=recusado`);
}

/** Pix confirmado por fora (ex.: webhook não chegou). */
export async function marcarSaquePago(formData: FormData) {
  await exigirAdmin();
  const saqueId = String(formData.get("saque_id") ?? "");
  await criarClienteAdmin().rpc("concluir_saque", { p_saque_id: saqueId, p_transferencia_id: null });
  revalidatePath("/admin/afiliados", "layout");
  redirect(`/admin/afiliados/saques/${saqueId}?aviso=pago`);
}

/** Pix não saiu: as comissões voltam ao saldo do afiliado. */
export async function marcarSaqueFalhou(formData: FormData) {
  await exigirAdmin();
  const saqueId = String(formData.get("saque_id") ?? "");
  await criarClienteAdmin().rpc("falhar_saque", { p_saque_id: saqueId, p_motivo: "Pix não concluído (marcado no backoffice)" });
  revalidatePath("/admin/afiliados", "layout");
  redirect(`/admin/afiliados/saques/${saqueId}?aviso=falhou`);
}
