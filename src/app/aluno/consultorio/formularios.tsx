"use client";

import { Plus, Search } from "lucide-react";
import { useActionState, useMemo, useRef, useState, useEffect } from "react";
import { TIPOS_CONSULTA, type TipoConsulta } from "@/lib/consultorio/consultorio";
import { botaoEscuro, ICONE_TIPO } from "./ui";
import {
  adicionarLancamento,
  agendarConsulta,
  salvarPaciente,
  salvarProva,
  type EstadoForm,
} from "./actions";

export const campoConsultorio =
  "w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-tinta";
const rotulo = "rotulo text-[10px] font-semibold text-slate-500";
const botao = botaoEscuro;

function Erro({ estado }: { estado: EstadoForm }) {
  return estado.erro ? <p className="text-sm text-red-600">{estado.erro}</p> : null;
}

/** Limpa o formulário depois de salvar com sucesso. */
function useLimparAoSalvar(estado: EstadoForm) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) form.current?.reset();
  }, [estado.ok]);
  return form;
}

// ---------------------------------------------------------------------------

export type PacienteForm = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  nascimento: string | null;
  observacoes: string;
};

export function FormPaciente({ paciente }: { paciente?: PacienteForm }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(salvarPaciente, {});
  const form = useLimparAoSalvar(estado);
  return (
    <form ref={form} action={acao} className="grid gap-3 sm:grid-cols-2">
      {paciente && <input type="hidden" name="id" value={paciente.id} />}
      <label className="space-y-1 sm:col-span-2">
        <span className={rotulo}>Nome *</span>
        <input name="nome" required maxLength={200} defaultValue={paciente?.nome} className={campoConsultorio} />
      </label>
      <label className="space-y-1">
        <span className={rotulo}>Telefone</span>
        <input name="telefone" type="tel" maxLength={40} defaultValue={paciente?.telefone} className={campoConsultorio} />
      </label>
      <label className="space-y-1">
        <span className={rotulo}>E-mail</span>
        <input name="email" type="email" maxLength={200} defaultValue={paciente?.email} className={campoConsultorio} />
      </label>
      <label className="space-y-1">
        <span className={rotulo}>Nascimento</span>
        <input name="nascimento" type="date" defaultValue={paciente?.nascimento ?? ""} className={campoConsultorio} />
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className={rotulo}>Observações</span>
        <textarea name="observacoes" rows={3} maxLength={4000} defaultValue={paciente?.observacoes} className={campoConsultorio} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={salvando} className={botao}>
          {paciente ? "Salvar alterações" : (<><Plus className="size-4" /> Cadastrar paciente</>)}
        </button>
        {estado.ok && !paciente && <span className="text-sm text-violeta-700">Paciente cadastrado.</span>}
        <Erro estado={estado} />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function FormConsulta({ dia, pacientes }: { dia: string; pacientes: { id: string; nome: string }[] }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(agendarConsulta, {});
  const [tipo, setTipo] = useState<TipoConsulta>("consulta");
  const [busca, setBusca] = useState("");
  const [pacienteId, setPacienteId] = useState("");
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (termo ? pacientes.filter((p) => p.nome.toLowerCase().includes(termo)) : pacientes).slice(0, 50);
  }, [busca, pacientes]);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="paciente_id" value={pacienteId} />

      <fieldset className="space-y-2">
        <legend className={`${rotulo} mb-2`}>Tipo de atendimento</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TIPOS_CONSULTA) as TipoConsulta[]).map((chave) => {
            const Icone = ICONE_TIPO[chave];
            const ativo = tipo === chave;
            return (
              <button
                key={chave}
                type="button"
                onClick={() => setTipo(chave)}
                aria-pressed={ativo}
                className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition ${
                  ativo ? "border-tinta bg-tinta text-white" : "border-slate-200 text-slate-700 hover:border-tinta"
                }`}
              >
                <Icone className={`size-3.5 ${ativo ? "text-lima" : ""}`} />
                {TIPOS_CONSULTA[chave].nome}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <p className={rotulo}>Paciente</p>
        {pacientes.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed border-slate-200 p-3 text-sm text-slate-500">
            Nenhum paciente ainda. Cadastre em Pacientes, ou marque sem paciente.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar paciente pelo nome…"
                className={`${campoConsultorio} pl-9`}
              />
            </div>
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              <button
                type="button"
                onClick={() => setPacienteId("")}
                className={`rounded-full border px-3 py-1 text-xs ${pacienteId === "" ? "border-tinta bg-lima font-semibold text-tinta" : "border-slate-200 text-slate-600 hover:border-tinta"}`}
              >
                Sem paciente
              </button>
              {filtrados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPacienteId(p.id)}
                  className={`rounded-full border px-3 py-1 text-xs ${pacienteId === p.id ? "border-tinta bg-lima font-semibold text-tinta" : "border-slate-200 text-slate-700 hover:border-tinta"}`}
                >
                  {p.nome}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className={rotulo}>Data *</span>
          <input name="dia" type="date" required defaultValue={dia} className={campoConsultorio} />
        </label>
        <label className="space-y-1">
          <span className={rotulo}>Horário *</span>
          <input name="hora" type="time" required step={300} className={campoConsultorio} />
        </label>
        <label className="space-y-1">
          <span className={rotulo}>Duração</span>
          <select name="duracao" defaultValue="60" className={campoConsultorio}>
            {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${m / 60}h${m % 60 ? ` ${m % 60}min` : ""}`}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={rotulo}>Valor (R$)</span>
          <input name="valor" inputMode="decimal" placeholder="Ex.: 250,00" className={campoConsultorio} />
        </label>
      </div>
      <label className="block space-y-1">
        <span className={rotulo}>Observações</span>
        <textarea name="observacoes" rows={2} maxLength={4000} className={campoConsultorio} />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={salvando} className={botao}>
          <Plus className="size-4" /> Marcar
        </button>
        <Erro estado={estado} />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function FormLancamento({ tipo, dataPadrao }: { tipo: "faturamento" | "custo"; dataPadrao: string }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(adicionarLancamento, {});
  const form = useLimparAoSalvar(estado);
  return (
    <form ref={form} action={acao} className="space-y-2">
      <input type="hidden" name="tipo" value={tipo} />
      <input
        name="descricao"
        required
        maxLength={200}
        placeholder={tipo === "faturamento" ? "Descrição (ex.: atendimento particular)" : "Descrição (ex.: material, aluguel)"}
        className={campoConsultorio}
      />
      <div className="grid grid-cols-2 gap-2">
        <input name="valor" required inputMode="decimal" placeholder="Ex.: 2.500,00" className={campoConsultorio} />
        <input name="data" type="date" required defaultValue={dataPadrao} className={campoConsultorio} />
      </div>
      <button disabled={salvando} className={`${botao} w-full`}>
        <Plus className="size-4" /> {tipo === "faturamento" ? "Lançar entrada" : "Lançar saída"}
      </button>
      <Erro estado={estado} />
    </form>
  );
}

// ---------------------------------------------------------------------------

export function FormProva({ disciplinas, dia }: { disciplinas: string[]; dia: string }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(salvarProva, {});
  const [materia, setMateria] = useState("");
  const [escolhida, setEscolhida] = useState(false);
  const termo = materia.trim().toLowerCase();
  const sugestoes = disciplinas.filter((d) => !termo || d.toLowerCase().includes(termo)).slice(0, 8);

  return (
    <form action={acao} className="space-y-4">
      <div className="space-y-2">
        <span className={rotulo}>Matéria *</span>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            name="materia"
            required
            maxLength={200}
            value={materia}
            onChange={(e) => {
              setMateria(e.target.value);
              setEscolhida(false);
            }}
            placeholder="Disciplina da plataforma ou matéria pessoal"
            className={`${campoConsultorio} pl-9`}
          />
        </div>
        {!escolhida && (
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {sugestoes.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setMateria(d);
                  setEscolhida(true);
                }}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:border-tinta hover:bg-lima"
              >
                {d}
              </button>
            ))}
            {termo && !disciplinas.some((d) => d.toLowerCase() === termo) && (
              <p className="w-full px-1 text-xs text-slate-500">
                Não achou? “{materia.trim()}” será salva como matéria pessoal.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className={rotulo}>Data *</span>
          <input name="data" type="date" required defaultValue={dia} className={campoConsultorio} />
        </label>
        <label className="space-y-1">
          <span className={rotulo}>Horário</span>
          <input name="horario" type="time" className={campoConsultorio} />
        </label>
      </div>
      <label className="block space-y-1">
        <span className={rotulo}>Observações</span>
        <textarea name="observacoes" rows={2} maxLength={2000} placeholder="Conteúdo da prova, sala…" className={campoConsultorio} />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={salvando} className={botao}>
          <Plus className="size-4" /> Salvar prova
        </button>
        <Erro estado={estado} />
      </div>
    </form>
  );
}
