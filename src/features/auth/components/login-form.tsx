"use client";

import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { loginAction } from "../actions";

export function LoginForm() {
  return (
    <ActionForm action={loginAction} className="space-y-4">
      <Field name="username" label="Benutzername">
        <Input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus />
      </Field>
      <Field name="password" label="Passwort">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton pendingText="Prüfe …" className="w-full">
        Einloggen
      </SubmitButton>
    </ActionForm>
  );
}
