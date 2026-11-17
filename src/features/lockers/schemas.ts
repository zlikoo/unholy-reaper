import { z } from "zod";
import { ROLES } from "@/lib/labels";
import { checkbox, optionalText, requiredText } from "@/lib/validation";
import { parseDateInput } from "@/lib/dates";

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const lockerSchema = z.object({
  name: requiredText("Name", 60),
  number: optionalText("Schließfachnummer", 20),
  location: optionalText("Standort", 120),
  purpose: optionalText("Verwendung", 120),
  /** Leer = nicht bezahlt / unbekannt */
  paidAt: z.preprocess(asString, z.string()).transform((value, ctx) => {
    if (value === "") return null;
    const date = parseDateInput(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message: "„Bezahlt am“ ist ungültig." });
      return z.NEVER;
    }
    return date;
  }),
  notes: optionalText("Notizen", 1000),
  /** Leer = unverändert (beim Bearbeiten) bzw. kein Code (beim Anlegen) */
  code: z.preprocess(
    asString,
    z
      .string()
      .max(12, "Die PIN darf höchstens 12 Ziffern haben.")
      .refine((v) => v === "" || /^\d{3,12}$/.test(v), "Die PIN besteht aus 3 bis 12 Ziffern."),
  ),
  password: z.preprocess(asString, z.string().max(64, "Das Passwort darf höchstens 64 Zeichen haben.")),
  clearCode: checkbox,
  clearPassword: checkbox,
  roles: z
    .array(z.enum(ROLES as [(typeof ROLES)[number], ...(typeof ROLES)[number][]]))
    // Der President hat immer Zugriff, Hangarounds nie.
    .transform((roles) => [...new Set([...roles.filter((r) => r !== "HANGAROUND"), "PRESIDENT" as const])]),
});

/** FormData → Objekt inkl. aller angehakten Ränge. */
export function lockerFormInput(formData: FormData) {
  const input: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) if (key !== "roles" && typeof value === "string") input[key] = value;
  input.roles = formData.getAll("roles").filter((v): v is string => typeof v === "string");
  return input;
}
