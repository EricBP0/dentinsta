import { describe, expect, it } from "vitest";
import { acessoDasAssinaturas, situacaoItem, temModulo, type AssinaturaRow } from "./acesso";

const agora = new Date("2026-10-10T12:00:00Z");
const linha = (parcial: Partial<AssinaturaRow>): AssinaturaRow => ({
  id: "a1",
  usuario_id: "eu",
  plano: "essencial",
  ciclo: "mensal",
  modulos: ["disciplinas"],
  status: "ativa",
  periodo_ate: "2026-11-01T00:00:00Z",
  ativa_ate: "2026-11-04T00:00:00Z",
  origem: "asaas",
  ...parcial,
});

describe("acessoDasAssinaturas", () => {
  it("sem assinatura válida não há acesso", () => {
    expect(acessoDasAssinaturas([], "eu", agora)).toBeNull();
    expect(acessoDasAssinaturas([linha({ ativa_ate: "2026-10-01T00:00:00Z" })], "eu", agora)).toBeNull();
    expect(acessoDasAssinaturas([linha({ status: "pendente" })], "eu", agora)).toBeNull();
    expect(acessoDasAssinaturas([linha({ status: "encerrada" })], "eu", agora)).toBeNull();
  });
  it("cancelada continua valendo até o fim do período", () => {
    expect(acessoDasAssinaturas([linha({ status: "cancelada" })], "eu", agora)?.status).toBe("cancelada");
  });
  it("convidado do Duplo não é titular", () => {
    const acesso = acessoDasAssinaturas(
      [linha({ usuario_id: "titular", plano: "duplo", modulos: ["disciplinas", "simulados", "flashcards", "chat", "consultorio"] })],
      "eu",
      agora,
    );
    expect(acesso?.titular).toBe(false);
    expect(acesso?.modulos).toHaveLength(5);
  });
  it("soma os módulos de mais de uma assinatura válida", () => {
    const acesso = acessoDasAssinaturas(
      [linha({ modulos: ["disciplinas", "chat"] }), linha({ id: "a2", modulos: ["disciplinas", "simulados"], ativa_ate: "2026-12-01T00:00:00Z" })],
      "eu",
      agora,
    );
    expect(acesso?.assinaturaId).toBe("a2");
    expect(acesso?.modulos).toEqual(["disciplinas", "simulados", "chat"]);
  });
});

describe("temModulo e situacaoItem", () => {
  const essencial = acessoDasAssinaturas([linha({ modulos: ["disciplinas", "chat"] })], "eu", agora);
  it("libera só o que o plano tem", () => {
    expect(temModulo(essencial, "chat", false, agora)).toBe(true);
    expect(temModulo(essencial, "simulados", false, agora)).toBe(false);
  });
  it("vence junto com a assinatura", () => {
    expect(temModulo(essencial, "chat", false, new Date("2026-11-05T00:00:00Z"))).toBe(false);
  });
  it("equipe usa tudo", () => {
    expect(temModulo(null, "consultorio", true)).toBe(true);
    expect(situacaoItem({ acesso: null, tipo: "flashcards", equipe: true })).toBe("liberado");
  });
  it("flashcards dependem do módulo; o resto, de Disciplinas", () => {
    expect(situacaoItem({ acesso: essencial, tipo: "video" })).toBe("liberado");
    expect(situacaoItem({ acesso: essencial, tipo: "flashcards" })).toBe("bloqueado");
    expect(situacaoItem({ acesso: null, tipo: "video" })).toBe("sem_acesso");
  });
});
