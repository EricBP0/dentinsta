"use client";

import { useActionState, useState } from "react";
import { botaoPrimario, campo, Rotulo } from "@/components/admin-ui";
import { LETRAS, rubricaParaTexto, type QuestaoNova } from "@/lib/questoes/questao";
import { salvarQuestao, type EstadoQuestao } from "./actions";

export type QuestaoExistente = QuestaoNova & {
  id: string;
  disciplina_id: string;
  status: string;
  origem?: string;
  fonte?: string;
};

export function FormularioQuestao({
  disciplinas,
  questao,
  disciplinaPadrao,
}: {
  disciplinas: { id: string; nome: string }[];
  questao?: QuestaoExistente;
  disciplinaPadrao?: string;
}) {
  const [estado, acao, salvando] = useActionState<EstadoQuestao, FormData>(salvarQuestao, {});
  const [tipo, setTipo] = useState(questao?.tipo ?? "objetiva");

  return (
    <form action={acao} className="space-y-4 rounded-2xl border-2 border-tinta bg-white p-6">
      <input type="hidden" name="id" value={questao?.id ?? ""} />
      {questao?.origem === "ia" && (
        <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
          Gerada por IA — confira o conteúdo clínico antes de aprovar.
          {questao.fonte && <span className="block text-xs">Fonte no material: {questao.fonte}</span>}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Rotulo texto="Disciplina">
          <select name="disciplina_id" defaultValue={questao?.disciplina_id ?? disciplinaPadrao ?? ""} required className={campo}>
            <option value="">Escolha…</option>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>{d.nome}</option>
            ))}
          </select>
        </Rotulo>
        <Rotulo texto="Tipo">
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className={campo}>
            <option value="objetiva">Objetiva</option>
            <option value="discursiva">Discursiva</option>
          </select>
        </Rotulo>
        <Rotulo texto="Dificuldade">
          <select name="dificuldade" defaultValue={questao?.dificuldade ?? 2} className={campo}>
            <option value="1">Fácil</option>
            <option value="2">Média</option>
            <option value="3">Difícil</option>
          </select>
        </Rotulo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Rotulo texto="Tema" dica="Usado para filtrar simulados (ex.: Irrigação, Acesso coronário).">
          <input name="tema" defaultValue={questao?.tema ?? ""} className={campo} />
        </Rotulo>
        <Rotulo texto="Estilo / referência (opcional)" dica="Ex.: estilo USP. Apenas referência, não copie enunciados.">
          <input name="estilo" defaultValue={questao?.estilo ?? ""} className={campo} />
        </Rotulo>
      </div>

      <Rotulo texto="Enunciado">
        <textarea name="enunciado" defaultValue={questao?.enunciado ?? ""} rows={4} required className={campo} />
      </Rotulo>

      {tipo === "objetiva" ? (
        <>
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Alternativas (deixe em branco as que não usar)</span>
            {LETRAS.map((letra) => (
              <div key={letra} className="flex items-center gap-2">
                <span className="w-5 text-sm font-semibold text-slate-600">{letra}</span>
                <input
                  name={`alternativa_${letra}`}
                  defaultValue={questao?.alternativas.find((a) => a.letra === letra)?.texto ?? ""}
                  className={campo}
                />
              </div>
            ))}
          </div>
          <Rotulo texto="Alternativa correta">
            <select name="gabarito" defaultValue={questao?.gabarito ?? "A"} className={`${campo} w-24`}>
              {LETRAS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Rotulo>
        </>
      ) : (
        <>
          <Rotulo texto="Resposta esperada (gabarito)" dica="A IA compara a resposta do aluno com este texto.">
            <textarea name="gabarito" defaultValue={questao?.gabarito ?? ""} rows={5} className={campo} />
          </Rotulo>
          <Rotulo
            texto="Rubrica de correção"
            dica='Um critério por linha, com os pontos no fim. Ex.: "Cita o hipoclorito de sódio: 4". A nota final é convertida para 0 a 10.'
          >
            <textarea
              name="rubrica"
              defaultValue={questao ? rubricaParaTexto(questao.rubrica) : ""}
              rows={4}
              className={campo}
            />
          </Rotulo>
        </>
      )}

      <Rotulo texto="Explicação (aparece para o aluno depois do envio)">
        <textarea name="explicacao" defaultValue={questao?.explicacao ?? ""} rows={3} className={campo} />
      </Rotulo>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Rotulo texto="Status" dica="Só questões aprovadas entram nos simulados.">
          <select name="status" defaultValue={questao?.status ?? "aprovada"} className={campo}>
            <option value="aprovada">Aprovada</option>
            <option value="rascunho">Rascunho</option>
          </select>
        </Rotulo>
        <div className="flex items-center gap-3">
          {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
          <button disabled={salvando} className={`${botaoPrimario} disabled:opacity-60`}>
            {salvando ? "Salvando…" : "Salvar questão"}
          </button>
        </div>
      </div>
    </form>
  );
}
