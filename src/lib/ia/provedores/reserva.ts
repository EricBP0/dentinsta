// "Tenta o primeiro; se falhar ou recusar, o próximo." Sem dependência de
// provedor, para poder testar a ordem e as trocas.

import type { Alvo, Fluxo, Uso } from "./tipos";

const nome = (a: Alvo) => `${a.provedor}:${a.modelo}`;

/** Roda `tentativa` em cada alvo até um dar certo. Sem nenhum, repassa o último erro. */
export async function tentarEmOrdem<R>(alvos: Alvo[], tentativa: (alvo: Alvo) => Promise<R>, contexto: string): Promise<R> {
  if (!alvos.length) throw new Error("Nenhum provedor de IA configurado (GEMINI_API_KEY ou ANTHROPIC_API_KEY).");
  let ultimoErro: unknown;
  for (const alvo of alvos) {
    try {
      return await tentativa(alvo);
    } catch (erro) {
      ultimoErro = erro;
      console.warn(`IA (${contexto}): ${nome(alvo)} falhou, tentando o próximo`, erro);
    }
  }
  throw ultimoErro;
}

/**
 * Resposta em partes com reserva: troca de modelo se o atual falhar ou recusar
 * antes de mandar o primeiro pedaço. Depois que algo já foi mostrado ao aluno,
 * não troca (a resposta ficaria emendada).
 */
export function fluxoComReserva(alvos: Alvo[], abrir: (alvo: Alvo) => Fluxo, contexto: string): Fluxo {
  let resolver!: (r: { modelo: string; uso: Uso; recusado: boolean }) => void;
  let rejeitar!: (e: unknown) => void;
  const fim = new Promise<{ modelo: string; uso: Uso; recusado: boolean }>((ok, erro) => {
    resolver = ok;
    rejeitar = erro;
  });
  fim.catch(() => {}); // quem lê os pedaços recebe o erro; evita rejeição sem tratamento

  async function* pedacos() {
    if (!alvos.length) {
      const erro = new Error("Nenhum provedor de IA configurado (GEMINI_API_KEY ou ANTHROPIC_API_KEY).");
      rejeitar(erro);
      throw erro;
    }
    for (const [i, alvo] of alvos.entries()) {
      const ultimo = i === alvos.length - 1;
      let enviou = false;
      try {
        const fluxo = abrir(alvo);
        for await (const pedaco of fluxo.pedacos) {
          enviou = true;
          yield pedaco;
        }
        const resultado = await fluxo.fim;
        if (resultado.recusado && !enviou && !ultimo) {
          console.warn(`IA (${contexto}): ${nome(alvo)} recusou, tentando o próximo`);
          continue;
        }
        resolver(resultado);
        return;
      } catch (erro) {
        if (enviou || ultimo) {
          rejeitar(erro);
          throw erro;
        }
        console.warn(`IA (${contexto}): ${nome(alvo)} falhou, tentando o próximo`, erro);
      }
    }
  }

  return { pedacos: pedacos(), fim };
}
