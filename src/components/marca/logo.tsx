// Identidade OdontoLab (docs/MARCA.md). O símbolo é um dente que também é um
// frasco de laboratório: o "líquido" menta dentro dele e as bolhas coral.

export function Simbolo({ className = "size-8", titulo }: { className?: string; titulo?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role={titulo ? "img" : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
      <defs>
        <linearGradient id="ol-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14B8A6" />
          <stop offset="1" stopColor="#0B5E57" />
        </linearGradient>
        <clipPath id="ol-dente">
          <path d="M19 22c0-6.6 5.8-9.4 13-6 7.2-3.4 13-.6 13 6 0 6.2-2 9.6-2.8 15.4C41.3 44.6 40.6 52 37.4 52c-3.4 0-2.6-10.2-5.4-10.2S30 52 26.6 52c-3.2 0-3.9-7.4-4.8-14.6C21 31.6 19 28.2 19 22z" />
        </clipPath>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#ol-grad)" />
      <g clipPath="url(#ol-dente)">
        <rect x="16" y="12" width="32" height="44" fill="#fff" />
        <path d="M16 31c3.2-2.4 6.4-2.4 9.6 0s6.4 2.4 9.6 0 6.4-2.4 9.6 0V56H16z" fill="#99F6E4" />
      </g>
      <circle cx="48.5" cy="15" r="3.6" fill="#FF7A59" />
      <circle cx="53.5" cy="8.5" r="2.1" fill="#FFB199" />
    </svg>
  );
}

/** Símbolo + nome. `claro` para fundos escuros. */
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
    sm: { simbolo: "size-6", texto: "text-base" },
    md: { simbolo: "size-8", texto: "text-xl" },
    lg: { simbolo: "size-11", texto: "text-3xl" },
  }[tamanho];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Simbolo className={`${estilos.simbolo} shrink-0`} />
      <span className={`font-heading font-bold tracking-tight ${estilos.texto} ${claro ? "text-white" : "text-tinta"}`}>
        Odonto<span className={claro ? "text-teal-300" : "text-primary"}>Lab</span>
      </span>
    </span>
  );
}
