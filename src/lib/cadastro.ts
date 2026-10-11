// Dados de contato pedidos na hora de pagar e no "Quero conhecer".

export type Contato = { nome: string; email: string; telefone: string };

/** Resposta dos formulários de contato: o erro e o que foi digitado (para não apagar). */
export type EstadoContato = { erro?: string; valores?: Partial<Contato> };

export function contatoDoFormulario(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? ""),
    email: String(formData.get("email") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** WhatsApp com DDD, só dígitos (10 ou 11). Aceita +55, parênteses, traços e espaços. */
export function normalizarTelefone(valor: string): string | null {
  let digitos = valor.replace(/\D/g, "");
  if (digitos.length >= 12 && digitos.startsWith("55")) digitos = digitos.slice(2);
  if (digitos.length === 11 && digitos[2] !== "9") return null;
  return /^[1-9][0-9]{9,10}$/.test(digitos) ? digitos : null;
}

/** "11987654321" → "(11) 98765-4321". */
export function formatarTelefone(digitos: string): string {
  const meio = digitos.length === 11 ? 7 : 6;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, meio)}-${digitos.slice(meio)}`;
}

/** Link para conversar no WhatsApp. */
export function linkWhatsApp(digitos: string): string {
  return `https://wa.me/55${digitos}`;
}

export function validarContato(entrada: { nome: unknown; email: unknown; telefone: unknown }): Contato | { erro: string } {
  const nome = String(entrada.nome ?? "").replace(/\s+/g, " ").trim();
  const email = String(entrada.email ?? "").trim().toLowerCase();
  const telefone = normalizarTelefone(String(entrada.telefone ?? ""));
  if (nome.length < 2 || nome.length > 120) return { erro: "Informe seu nome." };
  if (!EMAIL.test(email) || email.length > 254) return { erro: "Informe um e-mail válido." };
  if (!telefone) return { erro: "Informe um WhatsApp válido, com DDD." };
  return { nome, email, telefone };
}
