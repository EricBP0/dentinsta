import { describe, expect, it, vi } from "vitest";
import { fluxoComReserva, tentarEmOrdem } from "./reserva";
import type { Alvo, Fluxo } from "./tipos";

vi.spyOn(console, "warn").mockImplementation(() => {});
const gemini: Alvo = { provedor: "gemini", modelo: "gemini-3.6-flash" };
const claude: Alvo = { provedor: "anthropic", modelo: "claude-opus-5-5" };
const uso = { entrada: 1, saida: 1, cache: 0 };

describe("tentarEmOrdem", () => {
  it("usa o primeiro que der certo", async () => {
    const chamados: string[] = [];
    const r = await tentarEmOrdem([gemini, claude], async (a) => (chamados.push(a.provedor), a.modelo), "teste");
    expect(r).toBe("gemini-3.6-flash");
    expect(chamados).toEqual(["gemini"]);
  });
  it("cai para a reserva quando o primeiro falha", async () => {
    const r = await tentarEmOrdem(
      [gemini, claude],
      async (a) => {
        if (a.provedor === "gemini") throw new Error("bloqueado");
        return a.modelo;
      },
      "teste",
    );
    expect(r).toBe("claude-opus-5-5");
  });
  it("sem nenhum que funcione, repassa o último erro", async () => {
    await expect(tentarEmOrdem([gemini, claude], async (a) => Promise.reject(new Error(a.provedor)), "t")).rejects.toThrow(
      "anthropic",
    );
    await expect(tentarEmOrdem([], async () => 1, "t")).rejects.toThrow("Nenhum provedor");
  });
});

function fluxo(pedacos: string[], opcoes: { erroDepois?: number; recusado?: boolean; modelo: string }): Fluxo {
  async function* gerar() {
    for (const [i, p] of pedacos.entries()) {
      if (opcoes.erroDepois === i) throw new Error("caiu");
      yield p;
    }
    if (opcoes.erroDepois === pedacos.length) throw new Error("caiu");
  }
  return { pedacos: gerar(), fim: Promise.resolve({ modelo: opcoes.modelo, uso, recusado: Boolean(opcoes.recusado) }) };
}

async function ler(f: Fluxo) {
  let texto = "";
  for await (const p of f.pedacos) texto += p;
  return { texto, fim: await f.fim };
}

describe("fluxoComReserva", () => {
  it("passa os pedaços do primeiro modelo", async () => {
    const r = await ler(fluxoComReserva([gemini, claude], (a) => fluxo(["Olá", "!"], { modelo: a.modelo }), "chat"));
    expect(r).toMatchObject({ texto: "Olá!", fim: { modelo: "gemini-3.6-flash" } });
  });
  it("troca de modelo se o primeiro falha antes de responder", async () => {
    const r = await ler(
      fluxoComReserva(
        [gemini, claude],
        (a) => (a.provedor === "gemini" ? fluxo([], { erroDepois: 0, modelo: a.modelo }) : fluxo(["Resposta"], { modelo: a.modelo })),
        "chat",
      ),
    );
    expect(r).toMatchObject({ texto: "Resposta", fim: { modelo: "claude-opus-5-5" } });
  });
  it("troca de modelo se o primeiro recusa sem responder", async () => {
    const r = await ler(
      fluxoComReserva(
        [gemini, claude],
        (a) => (a.provedor === "gemini" ? fluxo([], { recusado: true, modelo: a.modelo }) : fluxo(["Ok"], { modelo: a.modelo })),
        "chat",
      ),
    );
    expect(r.texto).toBe("Ok");
  });
  it("não emenda respostas: se já mostrou algo e caiu, repassa o erro", async () => {
    const f = fluxoComReserva([gemini, claude], (a) => fluxo(["Meia ", "resposta"], { erroDepois: 1, modelo: a.modelo }), "chat");
    let texto = "";
    await expect(
      (async () => {
        for await (const p of f.pedacos) texto += p;
      })(),
    ).rejects.toThrow("caiu");
    expect(texto).toBe("Meia ");
  });
  it("o último da lista recusando devolve a recusa", async () => {
    const r = await ler(fluxoComReserva([claude], (a) => fluxo([], { recusado: true, modelo: a.modelo }), "chat"));
    expect(r.fim.recusado).toBe(true);
  });
});
