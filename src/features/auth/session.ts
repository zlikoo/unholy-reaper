import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

import { SESSION_COOKIE } from "@/lib/session-cookie";

export { SESSION_COOKIE };
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  roadName: string | null;
  role: Role;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieSecure() {
  const setting = process.env.SESSION_COOKIE_SECURE;
  if (setting === "true") return true;
  if (setting === "false") return false;
  return process.env.NODE_ENV === "production";
}

/** Legt eine neue Sitzung an und setzt das Cookie. Nur in Server Actions aufrufen. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    expires: expiresAt,
  });
}

/** Beendet die aktuelle Sitzung. Nur in Server Actions aufrufen. */
export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { id: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Liefert das eingeloggte Mitglied oder null. Wird pro Anfrage nur einmal
 * aus der Datenbank gelesen. Rang und Aktiv-Status kommen immer frisch aus der DB,
 * Änderungen greifen also sofort.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: {
      user: {
        select: { id: true, username: true, name: true, roadName: true, role: true, active: true },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date() || !session.user.active) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  const { id, username, name, roadName, role } = session.user;
  return { id, username, name, roadName, role };
});

/** Wie getCurrentUser, leitet aber auf /login um, wenn niemand eingeloggt ist. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Entfernt alle Sitzungen eines Mitglieds (z. B. nach Deaktivierung oder Passwort-Reset). */
export async function destroyAllSessionsOf(userId: string, exceptCurrent = false) {
  if (!exceptCurrent) {
    await db.session.deleteMany({ where: { userId } });
    return;
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await db.session.deleteMany({
    where: { userId, ...(token ? { NOT: { id: hashToken(token) } } : {}) },
  });
}
