import { describe, expect, it } from "vitest";
import { dataProximaRevisao, ESTADO_INICIAL, proximoEstado, rotuloIntervalo, type Avaliacao } from "./repeticao";

function revisar(avaliacoes: Avaliacao[]) {
  return avaliacoes.reduce(proximoEstado, ESTADO_INICIAL);
}

describe("proximoEstado", () => {
  it("card novo: bom = 1 dia, depois 3 dias, depois cresce pela facilidade", () => {
    expect(revisar(["bom"]).intervaloDias).toBe(1);
    expect(revisar(["bom", "bom"]).intervaloDias).toBe(3);
    expect(revisar(["bom", "bom", "bom"]).intervaloDias).toBe(8); // 3 × 2,5
  });

  it("fácil pula mais e aumenta a facilidade", () => {
    const estado = revisar(["facil"]);
    expect(estado.intervaloDias).toBe(4);
    expect(estado.facilidade).toBe(2.65);
  });

  it("errar zera o intervalo, conta lapso e reduz a facilidade", () => {
    const estado = revisar(["bom", "bom", "errei"]);
    expect(estado).toEqual({ facilidade: 2.3, intervaloDias: 0, repeticoes: 0, lapsos: 1 });
  });

  it("facilidade nunca cai abaixo de 1,3 e intervalo nunca passa de 1 ano", () => {
    expect(revisar(Array(20).fill("errei")).facilidade).toBe(1.3);
    expect(revisar(Array(30).fill("facil")).intervaloDias).toBe(365);
  });

  it("intervalo sempre avança ao acertar", () => {
    let estado = revisar(["dificil", "dificil"]);
    for (let i = 0; i < 5; i++) {
      const seguinte = proximoEstado(estado, "bom");
      expect(seguinte.intervaloDias).toBeGreaterThan(estado.intervaloDias);
      estado = seguinte;
    }
  });
});

describe("agenda", () => {
  const agora = new Date("2026-10-01T12:00:00Z");
  it("card errado volta em 10 minutos; acertado volta em dias", () => {
    expect(dataProximaRevisao(revisar(["errei"]), agora).toISOString()).toBe("2026-10-01T12:10:00.000Z");
    expect(dataProximaRevisao(revisar(["bom"]), agora).toISOString()).toBe("2026-10-02T12:00:00.000Z");
  });
  it("rótulos dos botões", () => {
    expect(rotuloIntervalo(ESTADO_INICIAL, "errei")).toBe("10 min");
    expect(rotuloIntervalo(ESTADO_INICIAL, "bom")).toBe("1 dia");
    expect(rotuloIntervalo(ESTADO_INICIAL, "facil")).toBe("4 dias");
    expect(rotuloIntervalo({ facilidade: 2.5, intervaloDias: 40, repeticoes: 5, lapsos: 0 }, "bom")).toBe("3 meses");
  });
});
