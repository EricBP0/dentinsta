import { Check, ClipboardCheck, Layers, Lock, type LucideIcon, Map as MapaMental, NotebookText, PlayCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { tituloSemTipo } from "@/lib/thumbs";
import { NOME_TIPO_ITEM, type TipoItem } from "@/lib/tipos";

const ICONE_TIPO: Record<TipoItem, LucideIcon> = {
  video: PlayCircle,
  resumo: NotebookText,
  mapa_mental: MapaMental,
  flashcards: Layers,
  prova: ClipboardCheck,
};

/**
 * Card vertical (3:4) de um conteúdo: a arte da disciplina com o estado por
 * cima, e o tipo e o título embaixo. Sem link quando o conteúdo está bloqueado.
 */
export function ThumbConteudo({
  arte,
  disciplina,
  titulo,
  tipo,
  href,
  bloqueado,
  concluido,
}: {
  arte: string | null;
  disciplina: string;
  titulo: string;
  tipo: TipoItem;
  href: string | null;
  bloqueado: boolean;
  concluido: boolean;
}) {
  const Icone = ICONE_TIPO[tipo];
  const conteudo = (
    <>
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-violeta-900 shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
        {arte ? (
          <Image
            src={arte}
            alt=""
            fill
            sizes="(min-width: 640px) 176px, 140px"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-b from-violeta-950 to-violeta-700 p-4 text-center text-lg font-extrabold uppercase leading-tight text-white">
            {disciplina}
          </div>
        )}
        {concluido && (
          <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-lima text-tinta" title="Concluído">
            <Check className="size-4" strokeWidth={3} />
          </span>
        )}
        {bloqueado && (
          <div className="absolute inset-0 grid place-items-center bg-tinta/55">
            <span className="grid size-10 place-items-center rounded-full bg-white/90 text-tinta">
              <Lock className="size-5" />
            </span>
          </div>
        )}
      </div>
      <p className="mt-2 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-violeta-700">
        <Icone className="size-3.5" />
        {NOME_TIPO_ITEM[tipo]}
      </p>
      <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-slate-800 group-hover:text-violeta-700">
        {tituloSemTipo(titulo)}
      </p>
    </>
  );

  const classes = "group block w-[140px] shrink-0 snap-start sm:w-[176px]";
  return href ? (
    <Link href={href} role="listitem" className={classes}>
      {conteudo}
    </Link>
  ) : (
    <div role="listitem" className={classes}>
      {conteudo}
    </div>
  );
}
