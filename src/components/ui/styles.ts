// Gemeinsame Klassen für Eingabefelder (in Server- und Client-Komponenten nutzbar).
export const inputBaseClasses =
  "block rounded-md border border-line bg-ink/70 px-3 text-sm text-bone placeholder:text-ash/50 transition-colors " +
  "focus:border-blood-bright focus:outline-none focus:ring-1 focus:ring-blood-bright " +
  "aria-[invalid=true]:border-blood-bright disabled:opacity-60";

export const inputClasses = `${inputBaseClasses} w-full`;
