// Identidade OdontoLab (docs/MARCA.md): "odonto" em Bricolage Grotesque + o selo
// "LAB" em JetBrains Mono. O símbolo é o selo "oL" em lima.

/** Selo "oL" (avatar, ícone). */
export function Simbolo({ className = "size-8", titulo }: { className?: string; titulo?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[22%] bg-lima font-heading leading-none font-extrabold tracking-tighter text-tinta [container-type:inline-size] ${className}`}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <span className="text-[50cqw]">oL</span>
    </span>
  );
}

/**
 * Logotipo horizontal. Em fundo claro o selo LAB é violeta; com `claro` (fundo
 * escuro ou violeta) o nome fica branco e o selo vira lima.
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
    sm: { nome: "text-lg", selo: "text-[0.6rem] px-1.5 py-0.5 rounded" },
    md: { nome: "text-2xl", selo: "text-xs px-1.5 py-0.5 rounded-md" },
    lg: { nome: "text-4xl", selo: "text-sm px-2 py-1 rounded-md" },
  }[tamanho];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} aria-label="OdontoLab" role="img">
      <span
        aria-hidden
        className={`font-heading leading-none font-extrabold tracking-tighter ${estilos.nome} ${claro ? "text-white" : "text-tinta"}`}
      >
        odonto
      </span>
      <span
        aria-hidden
        className={`font-mono leading-none font-bold tracking-[0.12em] ${estilos.selo} ${
          claro ? "bg-lima text-tinta" : "bg-violeta text-white"
        }`}
      >
        LAB
      </span>
    </span>
  );
}
