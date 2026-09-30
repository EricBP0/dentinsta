import { describe, expect, it } from "vitest";
import { dataPorExtenso, montarTextoCertificado } from "./texto";

const base = {
  nomeAluno: "Maria da Silva",
  disciplina: "Endodontia",
  cargaHoraria: 40,
  emitidoEm: new Date("2026-10-05T15:00:00Z"),
  codigo: "A1B2C3D4E5F6",
  urlValidacao: "https://exemplo.com/certificado/A1B2C3D4E5F6",
  plataforma: "OdontoLab",
  responsavel: "Coordenação pedagógica",
  responsavelCargo: "",
};

describe("texto do certificado", () => {
  it("inclui disciplina e carga horária", () => {
    expect(montarTextoCertificado(base).corpo).toBe(
      "concluiu a disciplina Endodontia, com carga horária de 40 horas, na plataforma de estudos OdontoLab.",
    );
  });
  it("omite carga horária quando não cadastrada e usa singular para 1 hora", () => {
    expect(montarTextoCertificado({ ...base, cargaHoraria: 0 }).corpo).not.toContain("carga horária");
    expect(montarTextoCertificado({ ...base, cargaHoraria: 1 }).corpo).toContain("1 hora,");
  });
  it("data por extenso no horário de Brasília", () => {
    expect(dataPorExtenso(new Date("2026-10-01T02:00:00Z"))).toBe("30 de setembro de 2026");
  });
  it("deixa claro que é curso livre", () => {
    expect(montarTextoCertificado(base).rodape).toContain("curso livre");
  });
});
