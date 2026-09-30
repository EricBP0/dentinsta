// O backoffice trabalha no horário de Brasília (UTC-3, sem horário de verão desde 2019).
const FUSO = "-03:00";

/** "2026-10-01T08:00" (input datetime-local) → ISO em UTC, ou null. */
export function localParaIso(valor: FormDataEntryValue | null): string | null {
  if (typeof valor !== "string" || !valor) return null;
  const data = new Date(`${valor}:00${FUSO}`);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

/** ISO em UTC → valor para input datetime-local no horário de Brasília. */
export function isoParaLocal(iso: string | null): string {
  if (!iso) return "";
  const brasilia = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return brasilia.toISOString().slice(0, 16);
}
