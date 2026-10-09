// Só a área de conteúdo: o cabeçalho e o menu do Consultório ficam na tela.
export default function Carregando() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="h-24 animate-pulse rounded-2xl border-2 border-tinta/20 bg-white/70" />
      <div className="h-64 animate-pulse rounded-2xl border-2 border-tinta/20 bg-white/70" />
    </div>
  );
}
