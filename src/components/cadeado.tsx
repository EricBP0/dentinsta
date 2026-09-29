import Link from "next/link";
import { BarraAnimada } from "@/components/movimento";

export function BotaoRenovar({ texto = "Renove para liberar" }: { texto?: string }) {
  return (
    <Link
      href="/renovar"
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200"
    >
      🔒 {texto}
    </Link>
  );
}

export function BarraProgresso({ feitos, total }: { feitos: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((feitos / total) * 100);
  return (
    <div>
      <BarraAnimada porcentagem={pct} />
      <p className="mt-1 text-xs text-slate-600">
        {feitos} de {total} itens obrigatórios
      </p>
    </div>
  );
}
