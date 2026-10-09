import type { ReactNode } from "react";

// Peças visuais do padrão OdontoLab nas áreas logadas (aluno e backoffice):
// bordas pretas grossas, verde-limão de destaque, rótulos em fonte mono e a
// faixa quadriculada no topo das páginas.

export const botaoMarca =
  "inline-flex items-center justify-center gap-2 rounded-full border-2 border-tinta bg-lima px-4 py-2 text-sm font-bold text-tinta transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60";
export const botaoEscuro =
  "inline-flex items-center justify-center gap-2 rounded-full bg-tinta px-4 py-2 text-sm font-bold text-white transition hover:bg-violeta disabled:pointer-events-none disabled:opacity-60";
export const botaoContorno =
  "inline-flex items-center justify-center gap-2 rounded-full border-2 border-tinta bg-white px-4 py-2 text-sm font-bold text-tinta transition hover:bg-lima disabled:pointer-events-none disabled:opacity-60";
export const botaoSuave =
  "rounded-full border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-tinta hover:text-tinta";

/** Rótulo em fonte mono, como nas capas ("LAB 01"). */
export function RotuloMono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`rotulo text-[11px] font-semibold ${className}`}>{children}</p>;
}

/**
 * Faixa de topo das páginas. Violeta quadriculada na área do aluno; preta
 * (tinta) no backoffice.
 */
export function CabecalhoPagina({
  rotulo,
  titulo,
  descricao,
  children,
  tom = "violeta",
}: {
  rotulo?: string;
  titulo: ReactNode;
  descricao?: ReactNode;
  children?: ReactNode;
  tom?: "violeta" | "tinta";
}) {
  const fundo = tom === "violeta" ? "grade-violeta" : "grade-tinta";
  return (
    <header className={`${fundo} rounded-3xl border-2 border-tinta p-6 text-white sm:p-8`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-2">
          {rotulo && (
            <span
              className={`rotulo inline-block rounded-md px-2.5 py-1 text-[11px] font-bold ${
                tom === "violeta" ? "bg-tinta text-lima" : "bg-lima text-tinta"
              }`}
            >
              {rotulo}
            </span>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{titulo}</h1>
          {descricao && <div className="max-w-xl text-white/85">{descricao}</div>}
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </header>
  );
}

/** Bloco com a borda preta da marca. */
export function Painel({
  titulo,
  rotulo,
  acao,
  children,
  className = "",
}: {
  titulo?: ReactNode;
  rotulo?: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border-2 border-tinta bg-white p-4 sm:p-5 ${className}`}>
      {(titulo || acao || rotulo) && (
        <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            {rotulo && <RotuloMono className="text-violeta">{rotulo}</RotuloMono>}
            {titulo && <h2 className="text-lg font-extrabold tracking-tight text-tinta">{titulo}</h2>}
          </div>
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}

/** Indicador no estilo de elemento da tabela periódica. */
export function Indicador({
  sigla,
  numero,
  valor,
  rotulo,
  rodape,
  destaque = false,
}: {
  sigla: string;
  numero: string;
  valor: ReactNode;
  rotulo: string;
  rodape?: ReactNode;
  destaque?: boolean;
}) {
  return (
    <div className={`flex min-h-32 flex-col justify-between rounded-2xl border-2 border-tinta p-3 text-tinta ${destaque ? "bg-lima" : "bg-white"}`}>
      <div className="flex items-start justify-between">
        <span className="text-2xl font-extrabold tracking-tight">{sigla}</span>
        <span className="rotulo text-[10px] font-bold">{numero}</span>
      </div>
      <div>
        <div className="break-all text-2xl font-extrabold tracking-tight">{valor}</div>
        <p className="rotulo text-[10px] font-semibold text-tinta/70">{rotulo}</p>
        {rodape && <div className="mt-1">{rodape}</div>}
      </div>
    </div>
  );
}

/**
 * Esqueleto mostrado na hora em que o usuário troca de página (loading.tsx),
 * enquanto o servidor monta a página nova. Sem ele o clique parece não
 * responder até tudo carregar.
 */
export function PaginaCarregando({ tom = "violeta" }: { tom?: "violeta" | "tinta" }) {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div
        className={`${tom === "violeta" ? "grade-violeta" : "grade-tinta"} h-36 animate-pulse rounded-3xl border-2 border-tinta sm:h-40`}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border-2 border-tinta/20 bg-white/70" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border-2 border-tinta/20 bg-white/70" />
    </div>
  );
}
