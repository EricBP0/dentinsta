import { useId } from "react";

// Identidade OdontoLab (docs/MARCA.md): o dente como frasco de laboratório, meio
// cheio e com duas bolhas, + "OdontoLab" em Plus Jakarta Sans ExtraBold.
// O desenho é o mesmo de scripts/marca/gerar.py.

const DENTE =
  "M50 22.6C46.5 21.4 43 20.2 39.5 20.2C31.5 20.2 26.6 27.5 26.6 36.5C26.6 43.5 28.4 49.5 30.6 54.5" +
  "C32.6 59.5 33 67 34.3 75C35.2 81 36.2 85.7 39 85.7C41.6 85.7 42.2 82 42.8 77.5" +
  "C43.6 70.5 45 63.8 50 63.8C55 63.8 56.4 70.5 57.2 77.5C57.8 82 58.4 85.7 61 85.7" +
  "C63.8 85.7 64.8 81 65.7 75C67 67 67.4 59.5 69.4 54.5C71.6 49.5 73.4 43.5 73.4 36.5" +
  "C73.4 27.5 68.5 20.2 60.5 20.2C57 20.2 53.5 21.4 50 22.6Z";
const LIQUIDO = "M18 56C26 57.6 33 58.4 40 56.8C46.5 55.2 52 50.6 59 50.6C65 50.6 70 52.2 82 55.4V96H18Z";

const VERSOES = {
  // Fundos violeta ou escuros.
  lima: { fundo: "var(--color-lima)", liquido: "var(--color-violeta)", bolha: "var(--color-violeta)", bolinha: "var(--color-tinta)" },
  // Fundos claros.
  violeta: { fundo: "var(--color-violeta)", liquido: "var(--color-lima)", bolha: "var(--color-lima)", bolinha: "#fff" },
};

/** Ícone: quadrado arredondado com o dente-frasco. */
export function Simbolo({
  className = "size-8",
  versao = "violeta",
  titulo,
}: {
  className?: string;
  versao?: keyof typeof VERSOES;
  titulo?: string;
}) {
  const clip = useId();
  const c = VERSOES[versao];
  return (
    <svg
      viewBox="0 0 100 100"
      className={`shrink-0 ${className}`}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <defs>
        <clipPath id={clip}>
          <path d={DENTE} />
        </clipPath>
      </defs>
      <rect width="100" height="100" rx="23" fill={c.fundo} />
      <path d={DENTE} fill="#fff" />
      <path d={LIQUIDO} fill={c.liquido} clipPath={`url(#${clip})`} />
      <path d={DENTE} fill="none" stroke="var(--color-tinta)" strokeWidth="2.9" strokeLinejoin="round" />
      <circle cx="78.8" cy="19.9" r="4.4" fill={c.bolha} />
      <circle cx="85.7" cy="10.5" r="2.8" fill={c.bolinha} />
    </svg>
  );
}

/**
 * Logotipo: ícone + "OdontoLab". Em fundo claro: ícone violeta, "Lab" violeta.
 * Com `claro` (fundo violeta ou escuro): ícone lima, "Odonto" branco, "Lab" verde-limão.
 */
export function Logo({
  className = "",
  tamanho = "md",
  claro = false,
}: {
  className?: string;
  tamanho?: "sm" | "md" | "lg";
  claro?: boolean;
}) {
  const estilos = {
    sm: { simbolo: "size-6", texto: "text-lg", gap: "gap-1.5" },
    md: { simbolo: "size-8", texto: "text-2xl", gap: "gap-2" },
    lg: { simbolo: "size-11", texto: "text-4xl", gap: "gap-2.5" },
  }[tamanho];
  return (
    <span className={`inline-flex items-center ${estilos.gap} ${className}`} aria-label="OdontoLab" role="img">
      <Simbolo className={estilos.simbolo} versao={claro ? "lima" : "violeta"} />
      <span
        aria-hidden
        className={`font-heading leading-none font-extrabold tracking-tight ${estilos.texto} ${claro ? "text-white" : "text-tinta"}`}
      >
        Odonto<span className={claro ? "text-lima" : "text-violeta"}>Lab</span>
      </span>
    </span>
  );
}
