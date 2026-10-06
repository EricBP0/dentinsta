import { Fragment, type ReactNode } from "react";
import { ancoraSecao, type BlocoResumo, type ConteudoResumo, type Trecho } from "@/lib/resumos/tipos";

/**
 * Resumo importado dos PDFs: sumário + seções. Usa só as cores do tema
 * (primary, muted...), então acompanha a identidade visual do site.
 */
export function ResumoEstruturado({ resumo, figuras }: { resumo: ConteudoResumo; figuras: Record<string, string> }) {
  const comSumario = resumo.secoes.length > 1;
  return (
    <div className="space-y-8">
      {comSumario && (
        <nav aria-label="Sumário" className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 font-mono text-xs font-semibold tracking-widest text-muted-foreground uppercase">Neste módulo</p>
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {resumo.secoes.map((s, i) => (
              <li key={i}>
                <a href={`#${ancoraSecao(i)}`} className="flex gap-2 rounded-md px-2 py-1 hover:bg-muted">
                  <span className="font-mono text-primary">{s.numero || "·"}</span>
                  <span className="text-foreground">{s.titulo}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {resumo.secoes.map((s, i) => (
        <section key={i} id={ancoraSecao(i)} className="scroll-mt-20 space-y-4">
          <header className="flex items-center gap-3 border-b border-border pb-3">
            {s.numero && (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-lg font-bold text-primary-foreground">
                {s.numero}
              </span>
            )}
            <div>
              {s.rotulo && (
                <p className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">{s.rotulo}</p>
              )}
              <h2 className="font-heading text-xl font-bold text-foreground">{s.titulo}</h2>
            </div>
          </header>
          <Blocos blocos={s.blocos} figuras={figuras} />
        </section>
      ))}
    </div>
  );
}

function Blocos({ blocos, figuras }: { blocos: BlocoResumo[]; figuras: Record<string, string> }) {
  return (
    <div className="space-y-3 leading-relaxed text-foreground">
      {blocos.map((b, i) => (
        <Bloco key={i} bloco={b} figuras={figuras} />
      ))}
    </div>
  );
}

function Bloco({ bloco, figuras }: { bloco: BlocoResumo; figuras: Record<string, string> }) {
  switch (bloco.t) {
    case "p":
      return (
        <p>
          <Trechos trechos={bloco.r} />
        </p>
      );
    case "sub":
      return <h3 className="pt-2 font-heading text-lg font-semibold text-primary">{bloco.x}</h3>;
    case "caixa":
      return (
        <div className="rounded-r-xl border-l-4 border-primary bg-muted/60 px-4 py-3">
          {bloco.titulo && (
            <p className="mb-2 font-mono text-xs font-semibold tracking-widest text-primary uppercase">{bloco.titulo}</p>
          )}
          <Blocos blocos={bloco.blocos} figuras={figuras} />
        </div>
      );
    case "tabela":
      return (
        <div className="overflow-x-auto rounded-xl border border-border [contain:inline-size]">
          <table className="w-full text-left text-sm">
            <tbody>
              {bloco.linhas.map((linha, i) => {
                const cabecalho = bloco.cabecalho && i === 0;
                return (
                  <tr key={i} className={cabecalho ? "bg-foreground text-background" : "border-t border-border even:bg-muted/50"}>
                    {linha.map((celula, j) =>
                      cabecalho ? (
                        <th key={j} scope="col" className="px-3 py-2 font-semibold">
                          <Trechos trechos={celula} />
                        </th>
                      ) : (
                        <td key={j} className="px-3 py-2 align-top">
                          <Trechos trechos={celula} />
                        </td>
                      ),
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    case "img": {
      const url = figuras[bloco.src];
      if (!url) return null;
      return (
        <figure className="space-y-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário do Storage */}
          <img
            src={url}
            width={bloco.w}
            height={bloco.h}
            alt={bloco.legenda ?? ""}
            loading="lazy"
            className="mx-auto h-auto max-w-full rounded-lg border border-border bg-white"
          />
          {bloco.legenda && <figcaption className="text-center text-sm text-muted-foreground italic">{bloco.legenda}</figcaption>}
        </figure>
      );
    }
  }
}

function Trechos({ trechos }: { trechos: Trecho[] }) {
  return trechos.map((t, i) => {
    let conteudo: ReactNode = t.x;
    if (t.i) conteudo = <em>{conteudo}</em>;
    if (t.b || t.d) conteudo = <strong className={t.d ? "font-semibold text-primary" : "font-semibold"}>{conteudo}</strong>;
    return <Fragment key={i}>{conteudo}</Fragment>;
  });
}
