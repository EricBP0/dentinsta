"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

// Série única na cor da marca (validada: faixa de luminosidade, croma e contraste).
const COR_SERIE = "#5b3df0"; // Violeta da marca
const COR_GRADE = "#e2e8f0"; // slate-200
const COR_TEXTO = "#64748b"; // slate-500

export type Ponto = { rotulo: string; valor: number; detalhe?: string };

/**
 * Formatos dos valores. São nomes (não funções) porque os gráficos rodam no
 * navegador e recebem as props de páginas do servidor.
 */
export type Formato = "nota" | "minutos";

function formatarValor(formato: Formato, v: number): string {
  if (formato === "nota") return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const minutos = Math.round(v);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return minutos % 60 ? `${horas}h ${minutos % 60}min` : `${horas}h`;
}

function formatarEixo(formato: Formato, v: number): string {
  if (v === 0) return "0";
  if (formato === "nota") return formatarValor(formato, v);
  return v >= 60 ? `${(Math.round((v / 60) * 10) / 10).toLocaleString("pt-BR")}h` : `${Math.round(v)}min`;
}

/** Topo do eixo em número "redondo", com a metade também redonda (ex.: 2h → marcas 0, 1h, 2h). */
function tetoDoEixo(formato: Formato, maximo: number): number {
  if (maximo <= 0) return formato === "minutos" ? 60 : 1;
  if (formato === "minutos") {
    if (maximo <= 30) return 30;
    if (maximo <= 60) return 60;
    return Math.ceil(maximo / 120) * 120;
  }
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  return [1, 2, 5, 10].find((m) => m * potencia >= maximo)! * potencia;
}

function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observador = new ResizeObserver(([entrada]) => setLargura(entrada.contentRect.width));
    observador.observe(ref.current);
    return () => observador.disconnect();
  }, []);
  return [ref, largura] as const;
}

function Dica({
  x,
  y,
  largura,
  aoLado = false,
  children,
}: {
  x: number;
  y: number;
  largura: number;
  /** Ao lado da mira (linha) em vez de acima da marca (colunas), para não cobrir o dado. */
  aoLado?: boolean;
  children: ReactNode;
}) {
  const esquerda = aoLado
    ? x + 152 < largura
      ? x + 12
      : x - 152
    : Math.min(Math.max(x - 70, 0), Math.max(largura - 140, 0));
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left: esquerda, top: aoLado ? 0 : Math.max(y - 64, 0) }}
    >
      {children}
    </div>
  );
}

function TabelaDados({ pontos, formato, cabecalho }: { pontos: Ponto[]; formato: Formato; cabecalho: [string, string] }) {
  return (
    <details className="mt-2 text-xs text-slate-600">
      <summary className="cursor-pointer select-none text-slate-500 hover:text-slate-800">Ver em tabela</summary>
      <table className="mt-2 w-full text-left">
        <thead className="text-slate-500">
          <tr>
            <th className="py-1 font-medium">{cabecalho[0]}</th>
            <th className="py-1 text-right font-medium">{cabecalho[1]}</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {pontos.map((p, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="py-1">{p.detalhe ?? p.rotulo}</td>
              <td className="py-1 text-right text-slate-900">{formatarValor(formato, p.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

const MARGEM = { topo: 16, direita: 40, base: 24, esquerda: 28 };

/** Linha de uma série com mira (crosshair) que acompanha o ponteiro e as setas do teclado. */
export function GraficoLinha({
  pontos,
  maximo,
  formato,
  altura = 200,
  titulo,
  cabecalhoTabela,
}: {
  pontos: Ponto[];
  maximo: number;
  formato: Formato;
  altura?: number;
  titulo: string;
  cabecalhoTabela: [string, string];
}) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [ativo, setAtivo] = useState<number | null>(null);
  const formatar = (v: number) => formatarValor(formato, v);
  const areaL = Math.max(largura - MARGEM.esquerda - MARGEM.direita, 0);
  const areaA = altura - MARGEM.topo - MARGEM.base;
  const x = (i: number) => MARGEM.esquerda + (pontos.length === 1 ? areaL / 2 : (i / (pontos.length - 1)) * areaL);
  const y = (v: number) => MARGEM.topo + areaA - (v / maximo) * areaA;
  const marcas = [0, maximo / 2, maximo];
  const caminho = pontos.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.valor)}`).join(" ");

  function aoMover(e: PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left - MARGEM.esquerda;
    const i = pontos.length === 1 ? 0 : Math.round((px / areaL) * (pontos.length - 1));
    setAtivo(Math.min(Math.max(i, 0), pontos.length - 1));
  }
  function aoTeclar(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === "ArrowRight") setAtivo((a) => Math.min((a ?? -1) + 1, pontos.length - 1));
    if (e.key === "ArrowLeft") setAtivo((a) => Math.max((a ?? pontos.length) - 1, 0));
  }

  const ultimo = pontos.length - 1;
  return (
    <div>
      <div ref={ref} className="relative" style={{ height: altura }}>
        {largura > 0 && (
          <svg
            width={largura}
            height={altura}
            role="img"
            aria-label={titulo}
            tabIndex={0}
            onPointerMove={aoMover}
            onPointerLeave={() => setAtivo(null)}
            onFocus={() => setAtivo(ultimo)}
            onBlur={() => setAtivo(null)}
            onKeyDown={aoTeclar}
            className="touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-violeta-500/40"
          >
            {marcas.map((m) => (
              <g key={m}>
                <line x1={MARGEM.esquerda} x2={largura - MARGEM.direita} y1={y(m)} y2={y(m)} stroke={COR_GRADE} strokeWidth={1} />
                <text x={MARGEM.esquerda - 8} y={y(m)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={COR_TEXTO} className="tabular-nums">
                  {formatar(m)}
                </text>
              </g>
            ))}
            {[0, Math.floor(ultimo / 2), ultimo]
              .filter((i, pos, lista) => lista.indexOf(i) === pos && pontos[i])
              .map((i) => (
                <text key={i} x={x(i)} y={altura - 6} textAnchor={i === 0 && ultimo > 0 ? "start" : i === ultimo && ultimo > 0 ? "end" : "middle"} fontSize={11} fill={COR_TEXTO}>
                  {pontos[i].rotulo}
                </text>
              ))}
            <path d={`${caminho} L${x(ultimo)},${y(0)} L${x(0)},${y(0)} Z`} fill={COR_SERIE} opacity={0.1} />
            <path d={caminho} fill="none" stroke={COR_SERIE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {ativo !== null && (
              <line x1={x(ativo)} x2={x(ativo)} y1={MARGEM.topo} y2={y(0)} stroke="#a1a1b5" strokeWidth={1} />
            )}
            {/* último ponto sempre marcado e rotulado; o ativo ganha marcador */}
            {[ultimo, ...(ativo !== null && ativo !== ultimo ? [ativo] : [])].map((i) => (
              <circle key={i} cx={x(i)} cy={y(pontos[i].valor)} r={4} fill={COR_SERIE} stroke="white" strokeWidth={2} />
            ))}
            <text x={x(ultimo) + 8} y={y(pontos[ultimo].valor)} dominantBaseline="middle" fontSize={12} fontWeight={600} fill="#12121c">
              {formatar(pontos[ultimo].valor)}
            </text>
          </svg>
        )}
        {ativo !== null && largura > 0 && (
          <Dica x={x(ativo)} y={y(pontos[ativo].valor)} largura={largura} aoLado>
            <p className="text-sm font-semibold text-slate-900">{formatar(pontos[ativo].valor)}</p>
            <p className="flex items-center gap-1.5 text-slate-500">
              <span className="inline-block h-0.5 w-3 rounded" style={{ backgroundColor: COR_SERIE }} />
              {pontos[ativo].detalhe ?? pontos[ativo].rotulo}
            </p>
          </Dica>
        )}
      </div>
      <TabelaDados pontos={pontos} formato={formato} cabecalho={cabecalhoTabela} />
    </div>
  );
}

/** Colunas de uma série (ex.: tempo por dia), com dica por coluna no ponteiro e no foco. */
export function GraficoColunas({
  pontos,
  formato,
  altura = 200,
  titulo,
  cabecalhoTabela,
}: {
  pontos: Ponto[];
  formato: Formato;
  altura?: number;
  titulo: string;
  cabecalhoTabela: [string, string];
}) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [ativo, setAtivo] = useState<number | null>(null);
  const formatar = (v: number) => formatarValor(formato, v);
  const maximo = tetoDoEixo(formato, Math.max(...pontos.map((p) => p.valor), 0));
  const margem = { ...MARGEM, direita: 8, esquerda: 36 };
  const areaL = Math.max(largura - margem.esquerda - margem.direita, 0);
  const areaA = altura - margem.topo - margem.base;
  const faixa = pontos.length ? areaL / pontos.length : 0;
  const larguraBarra = Math.max(Math.min(24, faixa - 2), 2);
  const y = (v: number) => margem.topo + areaA - (v / maximo) * areaA;
  const xCentro = (i: number) => margem.esquerda + faixa * i + faixa / 2;

  function barra(i: number, v: number) {
    const x0 = xCentro(i) - larguraBarra / 2;
    const topo = y(v);
    const base = y(0);
    const h = base - topo;
    if (h <= 0) return "";
    const r = Math.min(4, h, larguraBarra / 2);
    // Canto arredondado só no topo (a ponta do dado); quadrado na base.
    return `M${x0},${base} V${topo + r} Q${x0},${topo} ${x0 + r},${topo} H${x0 + larguraBarra - r} Q${x0 + larguraBarra},${topo} ${x0 + larguraBarra},${topo + r} V${base} Z`;
  }

  const rotulosX = pontos.length > 7 ? [0, Math.floor((pontos.length - 1) / 2), pontos.length - 1] : pontos.map((_, i) => i);
  return (
    <div>
      <div ref={ref} className="relative" style={{ height: altura }} onPointerLeave={() => setAtivo(null)}>
        {largura > 0 && (
          <svg width={largura} height={altura} role="img" aria-label={titulo}>
            {[0, maximo / 2, maximo].map((m) => (
              <g key={m}>
                <line x1={margem.esquerda} x2={largura - margem.direita} y1={y(m)} y2={y(m)} stroke={COR_GRADE} strokeWidth={1} />
                <text x={margem.esquerda - 8} y={y(m)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={COR_TEXTO} className="tabular-nums">
                  {formatarEixo(formato, m)}
                </text>
              </g>
            ))}
            {pontos.map((p, i) => (
              <g key={i}>
                <path d={barra(i, p.valor)} fill={COR_SERIE} opacity={ativo === null || ativo === i ? 1 : 0.55} />
                {/* área de toque maior que a barra, cobrindo toda a faixa */}
                <rect
                  x={margem.esquerda + faixa * i}
                  y={margem.topo}
                  width={faixa}
                  height={areaA}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${p.detalhe ?? p.rotulo}: ${formatar(p.valor)}`}
                  onPointerEnter={() => setAtivo(i)}
                  onFocus={() => setAtivo(i)}
                  onBlur={() => setAtivo(null)}
                  className="outline-none"
                />
              </g>
            ))}
            {rotulosX.map((i) => (
              <text key={i} x={xCentro(i)} y={altura - 6} textAnchor="middle" fontSize={11} fill={COR_TEXTO}>
                {pontos[i]?.rotulo}
              </text>
            ))}
          </svg>
        )}
        {ativo !== null && largura > 0 && (
          <Dica x={xCentro(ativo)} y={y(pontos[ativo].valor)} largura={largura}>
            <p className="text-sm font-semibold text-slate-900">{formatar(pontos[ativo].valor)}</p>
            <p className="text-slate-500">{pontos[ativo].detalhe ?? pontos[ativo].rotulo}</p>
          </Dica>
        )}
      </div>
      <TabelaDados pontos={pontos} formato={formato} cabecalho={cabecalhoTabela} />
    </div>
  );
}
