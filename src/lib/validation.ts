import { z } from "zod";
import { parseDateInput, parseDateTimeInput } from "./dates";

// Deutsche Standard-Fehlermeldungen für zod.
z.config(z.locales.de());

/** Leere Strings und fehlende Werte werden zu "". */
const asString = (value: unknown) => (typeof value === "string" ? value : "");

/** Pflicht-Textfeld mit Längenbegrenzung. */
export function requiredText(label: string, max = 200) {
  return z.preprocess(
    asString,
    z
      .string()
      .trim()
      .min(1, `${label} ist ein Pflichtfeld.`)
      .max(max, `${label} darf höchstens ${max} Zeichen lang sein.`),
  );
}

/** Optionales Textfeld, leere Eingabe wird zu null. */
export function optionalText(label: string, max = 1000) {
  return z.preprocess(
    asString,
    z
      .string()
      .trim()
      .max(max, `${label} darf höchstens ${max} Zeichen lang sein.`)
      .transform((value) => (value === "" ? null : value)),
  );
}

/** Optionale ID (z. B. Auswahl eines Mitglieds), leer = null. */
export const optionalId = z.preprocess(
  asString,
  z
    .string()
    .trim()
    .max(64)
    .transform((value) => (value === "" ? null : value)),
);

/** Ganze, positive Zahl. Erlaubt Eingaben wie "12.500" oder "12 500". */
export function positiveInt(label: string, max = 1_000_000_000) {
  return z.preprocess(
    (value) => {
      let raw = asString(value).replace(/[\s$]/g, "");
      // "12.500" ist ein Tausenderpunkt, "12.5" oder "12,5" dagegen eine Dezimalzahl (wird abgelehnt)
      if (/^\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, "");
      raw = raw.replace(",", ".");
      return raw === "" ? undefined : Number(raw);
    },
    z
      .number({ error: `${label} muss eine Zahl sein.` })
      .int(`${label} muss eine ganze Zahl sein.`)
      .min(1, `${label} muss mindestens 1 sein.`)
      .max(max, `${label} ist zu groß.`),
  );
}

/** Checkbox: "on" = true, fehlt = false. */
export const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

/** Datum mit Uhrzeit aus <input type="datetime-local">. */
export function dateTimeField(label: string) {
  return z.preprocess(asString, z.string()).transform((value, ctx) => {
    const date = parseDateTimeInput(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message: `${label} ist ungültig.` });
      return z.NEVER;
    }
    return date;
  });
}

/** Datum aus <input type="date">. */
export function dateField(label: string) {
  return z.preprocess(asString, z.string()).transform((value, ctx) => {
    const date = parseDateInput(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message: `${label} ist ungültig.` });
      return z.NEVER;
    }
    return date;
  });
}

/** Optionale http(s)-URL, leer = null. */
export const optionalUrl = z.preprocess(
  asString,
  z
    .string()
    .trim()
    .max(500, "Die URL ist zu lang.")
    .refine(
      (value) => value === "" || /^https?:\/\/\S+$/i.test(value),
      "Bitte eine gültige URL mit http:// oder https:// angeben.",
    )
    .transform((value) => (value === "" ? null : value)),
);

/** Enum-Auswahl mit deutscher Fehlermeldung. */
export function enumField<T extends string>(values: readonly [T, ...T[]], label: string) {
  return z.preprocess(asString, z.enum(values, { error: `Bitte ${label} auswählen.` }));
}

/** Liest FormData als einfaches Objekt (nur String-Werte). */
export function formToObject(formData: FormData) {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

/** Optionales Datum mit Uhrzeit, leer = null. */
export function optionalDateTimeField(label: string) {
  return z.preprocess(asString, z.string()).transform((value, ctx) => {
    if (value.trim() === "") return null;
    const date = parseDateTimeInput(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message: `${label} ist ungültig.` });
      return z.NEVER;
    }
    return date;
  });
}
