import { describe, expect, it } from "vitest";
import {
  gradeDoMes,
  inicioConsulta,
  intervaloUtc,
  limitesDoMes,
  partesBrasilia,
  reaisParaCentavos,
  semanaDe,
  somarMeses,
} from "./clinica";

describe("reaisParaCentavos", () => {
  it("entende os formatos brasileiros", () => {
    expect(reaisParaCentavos("23.450")).toBe(2_345_000);
    expect(reaisParaCentavos("23.450,00")).toBe(2_345_000);
    expect(reaisParaCentavos("23450")).toBe(2_345_000);
    expect(reaisParaCentavos("2.500,5")).toBe(250_050);
    expect(reaisParaCentavos("R$ 1.234,56")).toBe(123_456);
    expect(reaisParaCentavos("10.99")).toBe(1_099);
    expect(reaisParaCentavos("1.000.000")).toBe(100_000_000);
  });

  it("recusa o que não é valor", () => {
    expect(reaisParaCentavos("")).toBeNull();
    expect(reaisParaCentavos("abc")).toBeNull();
    expect(reaisParaCentavos("1,2,3")).toBeNull();
    expect(reaisParaCentavos("-5")).toBeNull();
  });
});

describe("datas", () => {
  it("semana de segunda a domingo", () => {
    expect(semanaDe("2026-10-08")).toEqual([
      "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11",
    ]);
    expect(semanaDe("2026-10-11")[0]).toBe("2026-10-05");
  });

  it("meses", () => {
    expect(somarMeses("2026-12", 1)).toBe("2027-01");
    expect(somarMeses("2026-01", -1)).toBe("2025-12");
    expect(limitesDoMes("2026-02")).toEqual({ inicio: "2026-02-01", fim: "2026-02-28" });
  });

  it("grade do mês começa no domingo", () => {
    const grade = gradeDoMes("2026-10"); // 1º de outubro de 2026 é quinta
    expect(grade[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(grade.flat().filter(Boolean)).toHaveLength(31);
  });

  it("horário de Brasília", () => {
    expect(inicioConsulta("2026-10-08", "09:30")).toBe("2026-10-08T12:30:00.000Z");
    expect(partesBrasilia("2026-10-09T01:15:00.000Z")).toEqual({ dia: "2026-10-08", hora: "22:15" });
    expect(intervaloUtc("2026-10-08", "2026-10-08")).toEqual({
      de: "2026-10-08T03:00:00.000Z",
      ate: "2026-10-09T03:00:00.000Z",
    });
    expect(inicioConsulta("2026-10-08", "9h")).toBeNull();
  });
});
