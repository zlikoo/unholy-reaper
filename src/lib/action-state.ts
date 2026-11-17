import type { z } from "zod";

/** Rückgabewert aller Server Actions, die von Formularen aufgerufen werden. */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Zeitstempel, damit Formulare jede erfolgreiche Aktion erkennen. */
  at?: number;
};

export const initialActionState: ActionState = { status: "idle" };

export function actionSuccess(message?: string): ActionState {
  return { status: "success", message, at: Date.now() };
}

export function actionError(message: string, fieldErrors?: ActionState["fieldErrors"]): ActionState {
  return { status: "error", message, fieldErrors, at: Date.now() };
}

export function noPermission(): ActionState {
  return actionError("Dafür fehlt dir die Berechtigung.");
}

export function validationError(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return actionError("Bitte prüfe die markierten Felder.", fieldErrors);
}
