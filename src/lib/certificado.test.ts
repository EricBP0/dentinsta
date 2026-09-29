import { describe, expect, it } from "vitest";
import { progressoObrigatorio } from "./certificado";

describe("progressoObrigatorio", () => {
  // Exemplo do planejamento: 8 videoaulas obrigatórias, mapas e flashcards opcionais.
  const videos = Array.from({ length: 8 }, (_, i) => ({ id: `v${i}`, obrigatorio: true, liberado: true }));
  const opcionais = [
    { id: "m1", obrigatorio: false, liberado: true },
    { id: "f1", obrigatorio: false, liberado: true },
  ];
  const itens = [...videos, ...opcionais];

  it("completa ao concluir só os obrigatórios", () => {
    const feitos = new Set(videos.map((v) => v.id));
    expect(progressoObrigatorio(itens, feitos)).toEqual({ total: 8, concluidos: 8, completo: true });
  });

  it("não completa faltando um obrigatório", () => {
    const feitos = new Set(["v0", "v1", "v2", "v3", "v4", "v5", "v6", "m1", "f1"]);
    expect(progressoObrigatorio(itens, feitos)).toEqual({ total: 8, concluidos: 7, completo: false });
  });

  it("ignora obrigatórios bloqueados por renovação", () => {
    const comBloqueado = [...itens, { id: "novo", obrigatorio: true, liberado: false }];
    const feitos = new Set(videos.map((v) => v.id));
    expect(progressoObrigatorio(comBloqueado, feitos).completo).toBe(true);
  });

  it("disciplina sem obrigatórios não emite certificado", () => {
    expect(progressoObrigatorio(opcionais, new Set(["m1", "f1"])).completo).toBe(false);
  });
});
