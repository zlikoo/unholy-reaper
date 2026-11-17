"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionError, validationError, type ActionState } from "@/lib/action-state";
import { formToObject, requiredText } from "@/lib/validation";
import { logActivity } from "@/features/activity/log";
import { hashPassword } from "@/features/auth/password";
import { createSession } from "@/features/auth/session";
import { passwordField, usernameField } from "@/features/members/schemas";
import { DEFAULT_RULES } from "@/features/rules/default-rules";
import { setupAvailable } from "./status";

const setupSchema = z
  .object({
    setupCode: z.preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string()),
    username: usernameField,
    name: requiredText("Name", 80),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Die Passwörter stimmen nicht überein." });

function codeMatches(input: string) {
  const expected = process.env.SETUP_CODE;
  if (!expected) return process.env.NODE_ENV !== "production";
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await setupAvailable())) return actionError("Die Ersteinrichtung ist bereits abgeschlossen.");
  if (process.env.NODE_ENV === "production" && !process.env.SETUP_CODE) {
    return actionError("SETUP_CODE ist auf dem Server nicht gesetzt. Bitte als Umgebungsvariable eintragen.");
  }

  const parsed = setupSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;
  if (!codeMatches(data.setupCode)) return actionError("Der Einrichtungscode stimmt nicht.", { setupCode: ["Falscher Code."] });

  const passwordHash = await hashPassword(data.password);
  const user = await db.$transaction(async (tx) => {
    // Erneut prüfen, damit zwei gleichzeitige Einrichtungen nicht zwei Presidents anlegen.
    if ((await tx.user.count()) > 0) return null;
    const created = await tx.user.create({
      data: { username: data.username, name: data.name, passwordHash, role: "PRESIDENT", active: true },
    });
    if ((await tx.clubRule.count()) === 0) {
      await tx.clubRule.createMany({ data: DEFAULT_RULES.map((rule, index) => ({ ...rule, sortOrder: index })) });
    }
    await logActivity(
      {
        userId: created.id,
        action: "member.create",
        entityType: "MEMBER",
        entityId: created.id,
        summary: `Ersteinrichtung: President-Konto „${created.name}“ angelegt`,
      },
      tx,
    );
    return created;
  });
  if (!user) return actionError("Die Ersteinrichtung ist bereits abgeschlossen.");

  await createSession(user.id);
  redirect("/");
}
