import { describe, expect, it } from "vitest";
import { isoParaLocal, localParaIso } from "./datas";

describe("datas do backoffice", () => {
  it("converte horário de Brasília para UTC e de volta", () => {
    const iso = localParaIso("2026-10-01T08:00");
    expect(iso).toBe("2026-10-01T11:00:00.000Z");
    expect(isoParaLocal(iso)).toBe("2026-10-01T08:00");
  });
  it("aceita vazio", () => {
    expect(localParaIso("")).toBeNull();
    expect(isoParaLocal(null)).toBe("");
  });
});
