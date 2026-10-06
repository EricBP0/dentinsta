import Image from "next/image";

/** Capa da disciplina (3:2). Arquivos do site passam pela otimização do Next. */
export function CapaDisciplina({ src, nome, className = "" }: { src: string; nome: string; className?: string }) {
  const classes = `aspect-[3/2] w-full rounded-lg object-cover ${className}`;
  if (src.startsWith("/")) {
    return <Image src={src} alt={`Capa de ${nome}`} width={1200} height={800} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className={classes} />;
  }
  // eslint-disable-next-line @next/next/no-img-element -- capa externa cadastrada no admin
  return <img src={src} alt={`Capa de ${nome}`} loading="lazy" className={classes} />;
}
