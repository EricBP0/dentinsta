import { CalendarPlus, UserPlus } from "lucide-react";
import Link from "next/link";
import { exigirConsultorio } from "./acesso";
import { MenuConsultorio } from "./menu";

export default async function LayoutConsultorio({ children }: LayoutProps<"/aluno/consultorio">) {
  await exigirConsultorio();
  return (
    <div className="space-y-6">
      <header className="grade-violeta relative overflow-hidden rounded-3xl border-2 border-tinta p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="rotulo inline-block rounded-md bg-tinta px-2.5 py-1 text-[11px] font-bold text-lima">Lab · Consultório</span>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Consultório</h1>
            <p className="max-w-md text-white/85">Sua agenda, seus pacientes, seu caixa e suas provas, num lugar só.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/aluno/consultorio/agenda?novo=1"
              className="inline-flex items-center gap-2 rounded-full border-2 border-tinta bg-lima px-4 py-2 text-sm font-bold text-tinta transition hover:-translate-y-0.5"
            >
              <CalendarPlus className="size-4" /> Marcar atendimento
            </Link>
            <Link
              href="/aluno/consultorio/pacientes?novo=1"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/60 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <UserPlus className="size-4" /> Paciente
            </Link>
          </div>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <MenuConsultorio />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
