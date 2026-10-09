"use client";

/** Filtro em lista suspensa que aplica a busca assim que muda. */
export function FiltroSelect({
  nome,
  valor,
  rotulo,
  opcoes,
  todos,
}: {
  nome: string;
  valor: string;
  rotulo: string;
  opcoes: [valor: string, texto: string][];
  /** Texto da opção sem filtro (valor vazio). Omita para não ter essa opção. */
  todos?: string;
}) {
  return (
    <label>
      <span className="sr-only">{rotulo}</span>
      <select
        name={nome}
        defaultValue={valor}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`rounded-full border-2 bg-white px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-lima focus:outline-none ${
          valor ? "border-tinta text-tinta" : "border-slate-300 text-slate-700"
        }`}
      >
        {todos !== undefined && <option value="">{todos}</option>}
        {opcoes.map(([v, texto]) => (
          <option key={v} value={v}>
            {texto}
          </option>
        ))}
      </select>
    </label>
  );
}
