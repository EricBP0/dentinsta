import { Fragment, type ReactNode } from "react";

/** **negrito** e `código` dentro de uma linha. */
function emLinha(texto: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**") && parte.length > 4) return <strong key={i}>{parte.slice(2, -2)}</strong>;
    if (parte.startsWith("`") && parte.endsWith("`") && parte.length > 2)
      return (
        <code key={i} className="rounded bg-slate-200/70 px-1 text-[0.9em]">
          {parte.slice(1, -1)}
        </code>
      );
    return <Fragment key={i}>{parte}</Fragment>;
  });
}

type Bloco = { tipo: "p" | "ul" | "ol" | "h"; linhas: string[] };

/**
 * Markdown simples da resposta da IA (parágrafos, listas, títulos, negrito),
 * montado como elementos React: nada de HTML vindo da IA vai para a página.
 */
export function TextoFormatado({ texto }: { texto: string }) {
  const blocos: Bloco[] = [];
  for (const bruta of texto.split("\n")) {
    const linha = bruta.trimEnd();
    const item = linha.match(/^\s*[-*•]\s+(.*)$/);
    const numerado = linha.match(/^\s*\d+[.)]\s+(.*)$/);
    const titulo = linha.match(/^#{1,6}\s+(.*)$/);
    const ultimo = blocos.at(-1);
    if (!linha.trim()) {
      blocos.push({ tipo: "p", linhas: [] });
    } else if (titulo) {
      blocos.push({ tipo: "h", linhas: [titulo[1]] });
    } else if (item) {
      if (ultimo?.tipo === "ul") ultimo.linhas.push(item[1]);
      else blocos.push({ tipo: "ul", linhas: [item[1]] });
    } else if (numerado) {
      if (ultimo?.tipo === "ol") ultimo.linhas.push(numerado[1]);
      else blocos.push({ tipo: "ol", linhas: [numerado[1]] });
    } else if (ultimo?.tipo === "p") {
      ultimo.linhas.push(linha);
    } else {
      blocos.push({ tipo: "p", linhas: [linha] });
    }
  }

  return (
    <div className="space-y-2 leading-relaxed">
      {blocos
        .filter((b) => b.linhas.length)
        .map((b, i) => {
          if (b.tipo === "h") return <p key={i} className="font-semibold text-tinta">{emLinha(b.linhas[0])}</p>;
          if (b.tipo === "ul")
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {b.linhas.map((l, j) => <li key={j}>{emLinha(l)}</li>)}
              </ul>
            );
          if (b.tipo === "ol")
            return (
              <ol key={i} className="list-decimal space-y-1 pl-5">
                {b.linhas.map((l, j) => <li key={j}>{emLinha(l)}</li>)}
              </ol>
            );
          return (
            <p key={i}>
              {b.linhas.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {emLinha(l)}
                </Fragment>
              ))}
            </p>
          );
        })}
    </div>
  );
}
