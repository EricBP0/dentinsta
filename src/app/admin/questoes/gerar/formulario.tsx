"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { botaoPrimario, campo, Rotulo } from "@/components/admin-ui";
import { EXTENSOES_ACEITAS, mimeDoArquivo, validarArquivos } from "@/lib/ia/geracao/material";
import { criarClienteNavegador } from "@/lib/supabase/navegador";
import { criarGeracao } from "./actions";

function nomeSeguro(nome: string) {
  const [base, ...resto] = nome.split(".").reverse();
  const ext = resto.length ? base.toLowerCase() : "";
  const semExt = resto.length ? resto.reverse().join(".") : base;
  const limpo = semExt
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .slice(0, 80);
  return ext ? `${limpo}.${ext}` : limpo;
}

export function FormularioGeracao({
  disciplinas,
  disciplinaPadrao,
  deck,
}: {
  disciplinas: { id: string; nome: string }[];
  disciplinaPadrao?: string;
  /** Quando informado, gera flashcards para este deck em vez de questões. */
  deck?: { id: string; titulo: string };
}) {
  const router = useRouter();
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [etapa, setEtapa] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const form = new FormData(evento.currentTarget);

    const metadados = arquivos.map((a) => ({ nome: a.name, tipo: mimeDoArquivo(a.name, a.type), tamanho: a.size }));
    const erroArquivos = validarArquivos(metadados);
    if (erroArquivos) return setErro(erroArquivos);

    try {
      // Os arquivos vão direto do navegador para o armazenamento privado.
      const pasta = `geracoes/${crypto.randomUUID()}`;
      const supabase = criarClienteNavegador();
      const enviados = [];
      for (const [i, arquivo] of arquivos.entries()) {
        setEtapa(`Enviando ${arquivo.name} (${i + 1} de ${arquivos.length})…`);
        const caminho = `${pasta}/${nomeSeguro(arquivo.name)}`;
        const { error } = await supabase.storage
          .from("materiais")
          .upload(caminho, arquivo, { contentType: metadados[i].tipo });
        if (error) throw new Error(`Falha ao enviar ${arquivo.name}: ${error.message}`);
        enviados.push({ caminho, ...metadados[i] });
      }

      setEtapa("Enviando para a IA…");
      const resultado = await criarGeracao({
        alvo: deck ? "flashcards" : "questoes",
        itemId: deck?.id,
        cards: Number(form.get("cards")),
        disciplinaId: String(form.get("disciplina_id") ?? ""),
        tipoMaterial: form.get("tipo_material") === "prova" ? "prova" : "conteudo",
        arquivos: enviados,
        texto: String(form.get("texto") ?? ""),
        objetivas: Number(form.get("objetivas") ?? 0),
        discursivas: Number(form.get("discursivas") ?? 0),
        dificuldade: form.get("dificuldade") ? Number(form.get("dificuldade")) : null,
        tema: String(form.get("tema") ?? ""),
        instrucoes: String(form.get("instrucoes") ?? ""),
      });
      if (resultado.erro) throw new Error(resultado.erro);
      router.push("/admin/questoes/geracoes");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar.");
      setEtapa(null);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {deck ? (
          <Rotulo texto="Deck">
            <p className={`${campo} bg-slate-50`}>{deck.titulo}</p>
          </Rotulo>
        ) : (
          <Rotulo texto="Disciplina">
            <select name="disciplina_id" defaultValue={disciplinaPadrao ?? ""} required className={campo}>
              <option value="">Escolha…</option>
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </Rotulo>
        )}
        <Rotulo texto="O que é este material?">
          <select name="tipo_material" defaultValue="conteudo" className={campo}>
            <option value="conteudo">Conteúdo (livro, apostila, aula, resumo)</option>
            <option value="prova">Prova antiga (só referência de assuntos e estilo)</option>
          </select>
        </Rotulo>
      </div>

      <Rotulo texto="Arquivos" dica="PDF, Word (.docx), texto (.txt, .md) ou fotos das páginas. Até 10 arquivos e 22 MB no total.">
        <input
          type="file"
          multiple
          accept={EXTENSOES_ACEITAS}
          onChange={(e) => setArquivos(Array.from(e.target.files ?? []))}
          className={campo}
        />
      </Rotulo>
      {arquivos.length > 0 && (
        <ul className="text-xs text-slate-600">
          {arquivos.map((a) => (
            <li key={a.name}>
              {a.name} · {(a.size / 1024 / 1024).toFixed(1)} MB
            </li>
          ))}
        </ul>
      )}

      <Rotulo texto="Ou cole um texto (opcional)" dica="Anotações de aula, trechos, tópicos — também pode ser usado junto com os arquivos.">
        <textarea name="texto" rows={5} className={campo} />
      </Rotulo>

      {deck ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Rotulo texto="Quantidade de cards">
            <input name="cards" type="number" min={1} max={60} defaultValue={20} className={campo} />
          </Rotulo>
          <Rotulo texto="Tema (opcional)">
            <input name="tema" placeholder="Ex.: Irrigação" className={campo} />
          </Rotulo>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-4">
          <Rotulo texto="Objetivas">
            <input name="objetivas" type="number" min={0} max={30} defaultValue={10} className={campo} />
          </Rotulo>
          <Rotulo texto="Discursivas">
            <input name="discursivas" type="number" min={0} max={10} defaultValue={2} className={campo} />
          </Rotulo>
          <Rotulo texto="Dificuldade">
            <select name="dificuldade" className={campo}>
              <option value="">Variada</option>
              <option value="1">Fácil</option>
              <option value="2">Média</option>
              <option value="3">Difícil</option>
            </select>
          </Rotulo>
          <Rotulo texto="Tema (opcional)">
            <input name="tema" placeholder="Ex.: Irrigação" className={campo} />
          </Rotulo>
        </div>
      )}

      <Rotulo texto="Orientações para a IA (opcional)" dica='Ex.: "Priorize casos clínicos", "Cobre as indicações e contraindicações".'>
        <textarea name="instrucoes" rows={2} maxLength={2000} className={campo} />
      </Rotulo>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={etapa !== null} className={`${botaoPrimario} disabled:opacity-60`}>
          {etapa ?? (deck ? "Gerar flashcards" : "Gerar questões")}
        </button>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </div>
      <p className="text-xs text-slate-500">
        A geração roda em lote (metade do custo) e costuma levar de alguns minutos até 1 hora. O que a IA criar entra
        como rascunho para você revisar antes de liberar.
      </p>
    </form>
  );
}
