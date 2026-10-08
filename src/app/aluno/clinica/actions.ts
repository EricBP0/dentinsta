"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  diaValido,
  ehStatusConsulta,
  ehTipoConsulta,
  inicioConsulta,
  partesBrasilia,
  reaisParaCentavos,
} from "@/lib/clinica/clinica";
import { exigirClinica } from "./acesso";

export type EstadoForm = { erro?: string; ok?: number };

function texto(formData: FormData, campo: string, limite = 4000) {
  return String(formData.get(campo) ?? "").trim().slice(0, limite);
}

function revalidar() {
  revalidatePath("/aluno/clinica", "layout");
}

// ---------------------------------------------------------------------------
// Pacientes
// ---------------------------------------------------------------------------

export async function salvarPaciente(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirClinica();
  const id = texto(formData, "id");
  const nascimento = texto(formData, "nascimento");
  const dados = {
    nome: texto(formData, "nome", 200),
    telefone: texto(formData, "telefone", 40),
    email: texto(formData, "email", 200),
    nascimento: diaValido(nascimento) ? nascimento : null,
    observacoes: texto(formData, "observacoes"),
  };
  if (!dados.nome) return { erro: "Informe o nome do paciente." };

  const { error } = id
    ? await supabase.from("clinica_pacientes").update(dados).eq("id", id)
    : await supabase.from("clinica_pacientes").insert(dados);
  if (error) return { erro: "Não foi possível salvar o paciente." };
  revalidar();
  if (id) redirect("/aluno/clinica/pacientes");
  return { ok: Date.now() };
}

export async function excluirPaciente(formData: FormData) {
  const { supabase } = await exigirClinica();
  await supabase.from("clinica_pacientes").delete().eq("id", texto(formData, "id"));
  revalidar();
  redirect("/aluno/clinica/pacientes");
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export async function agendarConsulta(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirClinica();
  const tipo = texto(formData, "tipo");
  const inicio = inicioConsulta(texto(formData, "dia"), texto(formData, "hora"));
  const duracao = Number(texto(formData, "duracao") || 60);
  const valorTexto = texto(formData, "valor");
  const valor = valorTexto ? reaisParaCentavos(valorTexto) : 0;
  const pacienteId = texto(formData, "paciente_id") || null;

  if (!ehTipoConsulta(tipo)) return { erro: "Escolha o tipo de evento." };
  if (!inicio) return { erro: "Escolha a data e o horário." };
  if (!Number.isInteger(duracao) || duracao < 5 || duracao > 720) return { erro: "Duração inválida." };
  if (valor === null) return { erro: "Valor inválido. Use, por exemplo, 250 ou 1.250,00." };

  const { error } = await supabase.from("clinica_consultas").insert({
    tipo,
    inicio,
    duracao_min: duracao,
    valor_centavos: valor,
    paciente_id: pacienteId,
    observacoes: texto(formData, "observacoes"),
  });
  if (error) return { erro: "Não foi possível agendar." };
  revalidar();
  redirect(`/aluno/clinica/calendario?dia=${partesBrasilia(inicio).dia}`);
}

export async function mudarStatusConsulta(formData: FormData) {
  const { supabase } = await exigirClinica();
  const status = texto(formData, "status");
  if (!ehStatusConsulta(status)) return;
  await supabase.from("clinica_consultas").update({ status }).eq("id", texto(formData, "id"));
  revalidar();
}

export async function excluirConsulta(formData: FormData) {
  const { supabase } = await exigirClinica();
  await supabase.from("clinica_consultas").delete().eq("id", texto(formData, "id"));
  revalidar();
}

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

export async function adicionarLancamento(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirClinica();
  const tipo = texto(formData, "tipo");
  const descricao = texto(formData, "descricao", 200);
  const valor = reaisParaCentavos(texto(formData, "valor"));
  const data = texto(formData, "data");

  if (tipo !== "faturamento" && tipo !== "custo") return { erro: "Tipo inválido." };
  if (!descricao) return { erro: `Informe o tipo de ${tipo}.` };
  if (!valor) return { erro: "Valor inválido. Use, por exemplo, 2.500 ou 2.500,00." };
  if (valor >= 100_000_000_000) return { erro: "Valor alto demais." };
  if (!diaValido(data)) return { erro: "Data inválida." };

  const { error } = await supabase.from("clinica_lancamentos").insert({ tipo, descricao, valor_centavos: valor, data });
  if (error) return { erro: "Não foi possível salvar." };
  revalidar();
  return { ok: Date.now() };
}

export async function excluirLancamento(formData: FormData) {
  const { supabase } = await exigirClinica();
  await supabase.from("clinica_lancamentos").delete().eq("id", texto(formData, "id"));
  revalidar();
}

// ---------------------------------------------------------------------------
// Provas
// ---------------------------------------------------------------------------

export async function salvarProva(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirClinica();
  const materia = texto(formData, "materia", 200);
  const data = texto(formData, "data");
  const horario = texto(formData, "horario");
  if (!materia) return { erro: "Escolha ou escreva a matéria." };
  if (!diaValido(data)) return { erro: "Escolha a data da prova." };

  // Se o nome bate com uma disciplina da plataforma, a prova fica ligada a ela.
  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("id")
    .ilike("nome", materia.replace(/[%_\\]/g, "\\$&"))
    .limit(1)
    .maybeSingle<{ id: string }>();

  const { error } = await supabase.from("clinica_provas").insert({
    materia,
    data,
    horario: /^\d{2}:\d{2}$/.test(horario) ? horario : null,
    disciplina_id: disciplina?.id ?? null,
    observacoes: texto(formData, "observacoes", 2000),
  });
  if (error) return { erro: "Não foi possível salvar a prova." };
  revalidar();
  redirect(`/aluno/clinica/provas?mes=${data.slice(0, 7)}`);
}

export async function excluirProva(formData: FormData) {
  const { supabase } = await exigirClinica();
  await supabase.from("clinica_provas").delete().eq("id", texto(formData, "id"));
  revalidar();
}
