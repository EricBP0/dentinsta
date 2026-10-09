import { Coffee, GraduationCap, RotateCcw, Siren, Stethoscope, Syringe, type LucideIcon } from "lucide-react";
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

export {
  botaoEscuro,
  botaoMarca,
  botaoSuave,
  Indicador as Selo,
  Painel,
  RotuloMono as Rotulo,
} from "@/components/sistema";
