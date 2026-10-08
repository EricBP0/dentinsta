import { Coffee, GraduationCap, RotateCcw, Siren, Stethoscope, Syringe, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { TIPOS_CONSULTA, type TipoConsulta } from "@/lib/consultorio/consultorio";

export const ICONE_TIPO: Record<TipoConsulta, LucideIcon> = {
  consulta: Stethoscope,
  retorno: RotateCcw,
  procedimento: Syringe,
  urgencia: Siren,
  clinica_escola: GraduationCap,
  pessoal: Coffee,
};

/** Etiqueta colorida do tipo de atendimento. */
export function EtiquetaTipo({ tipo }: { tipo: TipoConsulta }) {
  const Icone = ICONE_TIPO[tipo];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${TIPOS_CONSULTA[tipo].cor}`}>
      <Icone className="size-3" />
      {TIPOS_CONSULTA[tipo].nome}
    </span>
  );
}

/** Rótulo em fonte mono, como nas capas ("LAB 01"). */
export function Rotulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`rotulo text-[11px] font-semibold ${className}`}>{children}</p>;
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
      {(titulo || acao) && (
        <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            {rotulo && <Rotulo className="text-violeta">{rotulo}</Rotulo>}
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
export function Selo({
  sigla,
  numero,
  valor,
  rotulo,
  destaque = false,
}: {
  sigla: string;
  numero: string;
  valor: ReactNode;
  rotulo: string;
  destaque?: boolean;
}) {
  return (
    <div className={`flex min-h-32 flex-col justify-between rounded-2xl border-2 border-tinta p-3 ${destaque ? "bg-lima" : "bg-white"} text-tinta`}>
      <div className="flex items-start justify-between">
        <span className="text-2xl font-extrabold tracking-tight">{sigla}</span>
        <span className="rotulo text-[10px] font-bold">{numero}</span>
      </div>
      <div>
        <p className="break-all text-2xl font-extrabold tracking-tight">{valor}</p>
        <p className="rotulo text-[10px] font-semibold text-tinta/70">{rotulo}</p>
      </div>
    </div>
  );
}

export const botaoMarca =
  "inline-flex items-center justify-center gap-2 rounded-full border-2 border-tinta bg-lima px-4 py-2 text-sm font-bold text-tinta transition hover:-translate-y-0.5 disabled:opacity-60";
export const botaoEscuro =
  "inline-flex items-center justify-center gap-2 rounded-full bg-tinta px-4 py-2 text-sm font-bold text-white transition hover:bg-violeta disabled:opacity-60";
export const botaoSuave = "rounded-full border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-tinta hover:text-tinta";
