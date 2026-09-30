import { describe, expect, it } from "vitest";
import {
  diaBrasilia,
  formatarDuracao,
  mediaComVariacao,
  sequenciaDeDias,
  temasParaReforcar,
  ultimosDias,
} from "./painel";

const agora = new Date("2026-10-10T15:00:00Z"); // 12h em Brasília

describe("dias", () => {
  it("usa o dia de Brasília", () => {
    expect(diaBrasilia(new Date("2026-10-10T02:00:00Z"))).toBe("2026-10-09");
  });
  it("lista os últimos dias até hoje", () => {
    expect(ultimosDias(3, agora)).toEqual(["2026-10-08", "2026-10-09", "2026-10-10"]);
  });
});

describe("sequenciaDeDias", () => {
  it("conta dias seguidos até hoje", () => {
    expect(sequenciaDeDias({ "2026-10-10": 600, "2026-10-09": 120, "2026-10-08": 300, "2026-10-06": 900 }, agora)).toBe(3);
  });
  it("se hoje ainda não estudou, mantém a sequência até ontem", () => {
    expect(sequenciaDeDias({ "2026-10-09": 600, "2026-10-08": 600 }, agora)).toBe(2);
  });
  it("menos de 1 minuto não conta e quebra a sequência", () => {
    expect(sequenciaDeDias({ "2026-10-10": 30, "2026-10-09": 30 }, agora)).toBe(0);
  });
});

describe("mediaComVariacao", () => {
  it("compara a média dos últimos 7 dias com os 7 anteriores", () => {
    const r = mediaComVariacao(
      [
        { nota: 8, finalizado_em: "2026-10-09T12:00:00Z" },
        { nota: 7, finalizado_em: "2026-10-05T12:00:00Z" },
        { nota: 5, finalizado_em: "2026-09-30T12:00:00Z" },
        { nota: 9, finalizado_em: "2026-08-01T12:00:00Z" },
      ],
      7,
      agora,
    );
    expect(r).toEqual({ media: 7.5, anterior: 5, variacao: 2.5, quantidade: 2 });
  });
  it("sem simulados no período, média nula", () => {
    expect(mediaComVariacao([], 7, agora).media).toBeNull();
  });
});

describe("formatarDuracao", () => {
  it("mostra minutos e horas", () => {
    expect(formatarDuracao(59 * 60)).toBe("59 min");
    expect(formatarDuracao(2 * 3600)).toBe("2h");
    expect(formatarDuracao(5400)).toBe("1h 30min");
  });
});

describe("temasParaReforcar", () => {
  it("ignora temas com poucas respostas e ordena pela pior média", () => {
    const temas = temasParaReforcar([
      { disciplina: "Endo", tema: "Irrigação", respondidas: 10, media: 7 },
      { disciplina: "Endo", tema: "Acesso", respondidas: 4, media: 4.5 },
      { disciplina: "Perio", tema: "Raspagem", respondidas: 2, media: 1 },
    ]);
    expect(temas.map((t) => t.tema)).toEqual(["Acesso", "Irrigação"]);
  });
});
