export type SearchParams = Record<string, string | string[] | undefined>;

/** Liest einen einzelnen Suchparameter als String ("" wenn nicht gesetzt). */
export function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** Prüft, ob ein Wert in einer erlaubten Liste ist. */
export function pickEnum<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Seitenzahl ab 1 */
export function getPage(params: SearchParams) {
  const page = Number.parseInt(getParam(params, "seite"), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}
