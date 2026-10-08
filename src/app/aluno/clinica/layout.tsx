import { AbasClinica } from "./abas";
import { exigirClinica } from "./acesso";

export default async function LayoutClinica({ children }: LayoutProps<"/aluno/clinica">) {
  await exigirClinica();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-tinta">ClinicaON</h1>
        <p className="text-sm text-slate-600">Gerencie seus pacientes, consultas, faturamento e provas.</p>
      </header>
      <AbasClinica />
      {children}
    </div>
  );
}
