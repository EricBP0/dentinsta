import { describe, expect, it } from "vitest";
import { inicioDoMes } from "./cota";

describe("inicioDoMes", () => {
  it("usa o mês de Brasília", () => {
    expect(inicioDoMes(new Date("2026-10-15T12:00:00Z")).toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });
  it("às 23h de 31/10 em Brasília (02h UTC de 01/11) ainda é outubro", () => {
    expect(inicioDoMes(new Date("2026-11-01T02:00:00Z")).toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });
});
