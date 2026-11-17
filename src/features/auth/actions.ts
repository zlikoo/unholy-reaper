"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionError, actionSuccess, validationError, type ActionState } from "@/lib/action-state";
import { formToObject, requiredText } from "@/lib/validation";
import { hashPassword, PASSWORD_MIN_LENGTH, verifyPassword, verifyPasswordOrDummy } from "./password";
import { clearFailedLogins, loginBlockedFor, registerFailedLogin } from "./rate-limit";
import { createSession, destroyAllSessionsOf, destroySession, requireUser } from "./session";

const loginSchema = z.object({
  username: requiredText("Benutzername", 50),
  password: requiredText("Passwort", 200),
});

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  const username = parsed.data.username.toLowerCase();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "lokal";
  const limitKey = `${username}|${ip}`;

  const blockedMs = loginBlockedFor(limitKey);
  if (blockedMs > 0) {
    const minutes = Math.ceil(blockedMs / 60000);
    return actionError(`Zu viele Fehlversuche. Bitte in ${minutes} Minute${minutes === 1 ? "" : "n"} erneut versuchen.`);
  }

  const user = await db.user.findUnique({ where: { username } });
  const valid = await verifyPasswordOrDummy(parsed.data.password, user?.passwordHash);

  if (!user || !valid) {
    registerFailedLogin(limitKey);
    return actionError("Benutzername oder Passwort ist falsch.");
  }
  if (!user.active) {
    return actionError("Dieses Konto ist deaktiviert. Wende dich an President oder Vice.");
  }

  clearFailedLogins(limitKey);
  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

const changePasswordSchema = z
  .object({
    currentPassword: requiredText("Aktuelles Passwort", 200),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Das neue Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen haben.`)
      .max(200, "Das neue Passwort ist zu lang."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Die Passwörter stimmen nicht überein.",
  });

export async function changeOwnPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(parsed.data.currentPassword, record.passwordHash))) {
    return actionError("Das aktuelle Passwort ist falsch.", { currentPassword: ["Passwort stimmt nicht."] });
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  // Andere Geräte abmelden, aktuelle Sitzung behalten.
  await destroyAllSessionsOf(user.id, true);
  return actionSuccess("Passwort geändert. Andere Geräte wurden abgemeldet.");
}
