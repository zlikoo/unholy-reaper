import { z } from "zod";
import { ROLES } from "@/lib/labels";
import { checkbox, dateField, enumField, optionalId, optionalText, requiredText } from "@/lib/validation";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/password";

const roleValues = ROLES as [(typeof ROLES)[number], ...(typeof ROLES)[number][]];

export const usernameField = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : ""),
  z
    .string()
    .min(3, "Der Benutzername braucht mindestens 3 Zeichen.")
    .max(30, "Der Benutzername darf höchstens 30 Zeichen haben.")
    .regex(/^[a-z0-9._-]+$/, "Nur Kleinbuchstaben, Ziffern, Punkt, Unterstrich und Bindestrich."),
);

export const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen haben.`)
  .max(200, "Das Passwort ist zu lang.");

export const memberSchema = z.object({
  username: usernameField,
  name: requiredText("Name", 80),
  roadName: optionalText("Road Name", 40),
  role: enumField(roleValues, "einen Rang"),
  joinedAt: dateField("Beitrittsdatum"),
  notes: optionalText("Notizen", 2000),
  sponsorId: optionalId,
  active: checkbox,
});

export const createMemberSchema = memberSchema.extend({ password: passwordField });

export const resetPasswordSchema = z.object({ password: passwordField });
