"use client";

import { ArrowLeft, Check, Gift, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { botaoEscuro, botaoMarca } from "@/components/sistema";
import { CARDS_NA_AMOSTRA, perguntasDa, UFS, type Pergunta, type Respostas } from "@/lib/perfil-cliente";
import { pularPersonalizacao, salvarEtapa } from "./actions";

const opcaoBase = "w-full rounded-2xl border-2 px-4 py-3 text-left font-semibold transition";
const opcaoCor = (marcada: boolean) =>
  marcada ? "border-tinta bg-lima text-tinta" : "border-slate-200 bg-white text-tinta hover:border-tinta";

/** Formulário de uma etapa: uma pergunta por tela, botões grandes e barra de progresso. */
export function Questionario({
  etapa,
  anteriores,
  disciplinas,
  premio,
  nome,
}: {
  etapa: 1 | 2;
  anteriores: Respostas;
  disciplinas: { id: string; nome: string }[];
  premio: boolean;
  nome: string;
}) {
  const [respostas, setRespostas] = useState<Respostas>(etapa === 1 ? {} : { contato: false });
  const [indice, setIndice] = useState(-1);
  const [erro, setErro] = useState("");
  // Guarda a etapa enviada: ao salvar, a página recarrega já na etapa seguinte.
  const [concluido, setConcluido] = useState<{ etapa: 1 | 2; amostra: number } | null>(null);
  const [enviando, iniciar] = useTransition();

  const caminho = (r: Respostas) => (etapa === 1 ? r : anteriores);
  const perguntas = perguntasDa(etapa, caminho(respostas));
  const atual = perguntas[indice];

  function enviar(finais: Respostas) {
    setErro("");
    iniciar(async () => {
      const r = await salvarEtapa(etapa, finais);
      if ("erro" in r) setErro(r.erro);
      else setConcluido({ etapa, amostra: r.amostra });
    });
  }

  /** Grava a resposta e vai para a próxima (ou envia, se era a última). */
  function avancar(novas: Respostas = respostas) {
    setRespostas(novas);
    const total = perguntasDa(etapa, caminho(novas)).length;
    if (indice + 1 < total) setIndice(indice + 1);
    else enviar(novas);
  }

  if (concluido) return <Concluido {...concluido} />;

  if (indice < 0) {
    return (
      <Cartao>
        <p className="rotulo flex items-center gap-1.5 text-[11px] font-semibold text-violeta-700">
          <Sparkles className="size-3.5" /> {etapa === 1 ? "Primeiro acesso" : "Etapa 2"}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-tinta">
          {etapa === 1 ? `${nome ? `${nome}, p` : "P"}ersonalize sua OdontoLab` : "Complete seu perfil"}
        </h1>
        <p className="text-slate-600">
          {etapa === 1
            ? "São 7 perguntas rápidas, cerca de 1 minuto. Com elas, o seu painel já mostra o que importa para você."
            : `Mais ${perguntas.length} perguntas rápidas, cerca de 2 minutos.`}
        </p>
        {premio && (
          <p className="flex items-center gap-2 rounded-2xl border-2 border-tinta bg-lima/40 p-3 text-sm font-semibold text-tinta">
            <Gift className="size-5 shrink-0" /> Ao terminar, você ganha {CARDS_NA_AMOSTRA} flashcards para revisar.
          </p>
        )}
        <p className="text-xs text-slate-500">Usamos suas respostas para personalizar a plataforma e nossas ofertas.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setIndice(0)} className={botaoMarca}>
            Começar
          </button>
          {etapa === 1 ? (
            <form action={pularPersonalizacao}>
              <button className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:text-tinta">Agora não</button>
            </form>
          ) : (
            <Link href="/aluno" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:text-tinta">
              Depois
            </Link>
          )}
        </div>
      </Cartao>
    );
  }

  return (
    <Cartao>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <button onClick={() => setIndice(indice - 1)} className="inline-flex items-center gap-1 hover:text-tinta" disabled={enviando}>
            <ArrowLeft className="size-3.5" /> Voltar
          </button>
          <span>
            {indice + 1} de {perguntas.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={indice + 1} aria-valuemax={perguntas.length}>
          <div className="h-full rounded-full bg-violeta transition-all" style={{ width: `${((indice + 1) / perguntas.length) * 100}%` }} />
        </div>
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-tinta">{atual.texto}</h1>
      <Resposta
        key={atual.id}
        pergunta={atual}
        respostas={respostas}
        disciplinas={disciplinas}
        enviando={enviando}
        ultima={indice + 1 === perguntas.length}
        avancar={avancar}
      />
      {erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
    </Cartao>
  );
}

function Cartao({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl space-y-5 rounded-3xl border-2 border-tinta bg-white p-6 sm:p-8">{children}</div>;
}

function Resposta({
  pergunta: p,
  respostas,
  disciplinas,
  enviando,
  ultima,
  avancar,
}: {
  pergunta: Pergunta;
  respostas: Respostas;
  disciplinas: { id: string; nome: string }[];
  enviando: boolean;
  ultima: boolean;
  avancar: (novas?: Respostas) => void;
}) {
  const [valor, setValor] = useState(respostas[p.id]);
  const [extra, setExtra] = useState(String(respostas[p.id === "p3" ? "p3_cidade" : `${p.id}_extra`] ?? ""));
  const [contato, setContato] = useState(respostas.contato === true);
  const [busca, setBusca] = useState("");
  const textoBotao = enviando ? "Salvando…" : ultima ? "Concluir" : "Continuar";
  const lista = Array.isArray(valor) ? valor : [];

  const com = (v: Respostas[string] | undefined, adicionais: Respostas = {}): Respostas => {
    const novas: Respostas = { ...respostas, ...adicionais };
    if (v === undefined || (Array.isArray(v) && !v.length) || v === "") delete novas[p.id];
    else novas[p.id] = v;
    return novas;
  };
  const continuar = (desabilitado: boolean, novas: () => Respostas) => (
    <div className="flex flex-wrap items-center gap-2">
      <button disabled={desabilitado || enviando} onClick={() => avancar(novas())} className={botaoEscuro}>
        {textoBotao}
      </button>
      {p.opcional && (
        <button disabled={enviando} onClick={() => avancar(com(undefined))} className="px-3 py-2 text-sm font-semibold text-slate-500 hover:text-tinta">
          Pular
        </button>
      )}
    </div>
  );

  if (p.tipo === "unica") {
    const pedeExtra = typeof valor === "string" && p.complemento?.quando.includes(valor);
    const pedeContato = p.id === "p25";
    return (
      <div className="space-y-2">
        {p.opcoes!.map(([v, rotulo]) => (
          <button
            key={v}
            disabled={enviando}
            onClick={() => {
              setValor(v);
              if (!p.complemento && !pedeContato) avancar(com(v));
            }}
            className={`${opcaoBase} ${opcaoCor(valor === v)}`}
          >
            {rotulo}
          </button>
        ))}
        {pedeExtra && (
          <input
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            maxLength={120}
            placeholder={p.complemento!.rotulo}
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 focus:border-tinta focus:outline-none"
          />
        )}
        {pedeContato && valor && (
          <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <input type="checkbox" checked={contato} onChange={(e) => setContato(e.target.checked)} className="mt-0.5 size-4 accent-tinta" />
            Aceito receber mensagens da OdontoLab por esse canal. Posso pedir para parar quando quiser.
          </label>
        )}
        {p.complemento || pedeContato
          ? continuar(!valor, () => com(valor, pedeContato ? { contato } : pedeExtra ? { [`${p.id}_extra`]: extra.trim() } : {}))
          : p.opcional && (
              <button disabled={enviando} onClick={() => avancar(com(undefined))} className="px-3 py-2 text-sm font-semibold text-slate-500 hover:text-tinta">
                Pular
              </button>
            )}
      </div>
    );
  }

  if (p.tipo === "multipla" || p.tipo === "disciplinas") {
    const opcoes: [string, string][] =
      p.tipo === "disciplinas" ? disciplinas.map((d) => [d.id, d.nome]) : p.opcoes!.map(([v, r]) => [v, r]);
    const max = p.max ?? opcoes.length;
    const visiveis = busca ? opcoes.filter(([, r]) => r.toLowerCase().includes(busca.toLowerCase())) : opcoes;
    const alternar = (v: string) =>
      setValor(lista.includes(v) ? lista.filter((x) => x !== v) : lista.length < max ? [...lista, v] : max === 1 ? [v] : lista);
    return (
      <div className="space-y-3">
        {p.tipo === "disciplinas" && (
          <label className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-3 py-2 focus-within:border-tinta">
            <Search className="size-4 text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar disciplina" className="w-full outline-none" />
          </label>
        )}
        <div className={`grid gap-2 sm:grid-cols-2 ${p.tipo === "disciplinas" ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
          {visiveis.map(([v, rotulo]) => (
            <button key={v} onClick={() => alternar(v)} className={`${opcaoBase} flex items-center gap-2 text-sm ${opcaoCor(lista.includes(v))}`}>
              <span className={`grid size-5 shrink-0 place-items-center rounded-md border-2 border-tinta ${lista.includes(v) ? "bg-tinta" : ""}`}>
                {lista.includes(v) && <Check className="size-3.5 text-lima" />}
              </span>
              {rotulo}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">{max < opcoes.length ? `Escolha até ${max}.` : "Marque quantas quiser."}</p>
        {continuar(!lista.length && !p.opcional, () => com(lista))}
      </div>
    );
  }

  if (p.tipo === "local") {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <select
            value={typeof valor === "string" ? valor : ""}
            onChange={(e) => setValor(e.target.value)}
            aria-label="Estado"
            className="rounded-xl border-2 border-slate-200 px-3 py-2 focus:border-tinta focus:outline-none"
          >
            <option value="">UF</option>
            {UFS.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </select>
          <input
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            maxLength={80}
            placeholder="Cidade"
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 focus:border-tinta focus:outline-none"
          />
        </div>
        {continuar(!valor, () => com(valor, { p3_cidade: extra.trim() }))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={typeof valor === "string" ? valor : ""}
        onChange={(e) => setValor(e.target.value)}
        maxLength={1000}
        rows={4}
        placeholder="Escreva com suas palavras"
        className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 focus:border-tinta focus:outline-none"
      />
      {continuar(!valor, () => com(typeof valor === "string" ? valor.trim() : undefined))}
    </div>
  );
}

function Concluido({ etapa, amostra }: { etapa: 1 | 2; amostra: number }) {
  return (
    <Cartao>
      <h1 className="text-3xl font-extrabold tracking-tight text-tinta">
        {amostra > 0 ? `Você ganhou ${amostra} flashcards!` : etapa === 1 ? "Pronto, sua OdontoLab está do seu jeito" : "Obrigado!"}
      </h1>
      <p className="text-slate-600">
        {amostra > 0
          ? "Eles já estão na sua área de Flashcards, começando pelas disciplinas que você marcou."
          : etapa === 1
            ? "Seu painel já mostra o que importa para você. Daqui a alguns dias, mais algumas perguntas rápidas."
            : "Suas respostas já personalizam o seu painel."}
      </p>
      <div className="flex flex-wrap gap-2">
        {amostra > 0 && (
          <Link href="/aluno/flashcards?estudar=1" className={botaoMarca}>
            Revisar agora
          </Link>
        )}
        <Link href="/aluno" className={amostra > 0 ? "rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:text-tinta" : botaoMarca}>
          Ir para o painel
        </Link>
      </div>
    </Cartao>
  );
}
