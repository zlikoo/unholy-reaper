import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Logo } from "@/components/layout/logo";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/password";
import { setupAction } from "@/features/setup/actions";
import { setupAvailable, setupCodeRequired } from "@/features/setup/status";

export const metadata: Metadata = { title: "Ersteinrichtung" };

export default async function SetupPage() {
  // Bei jedem Aufruf neu prüfen (nicht beim Build vorrendern), ob die Einrichtung noch offen ist.
  await connection();
  if (!(await setupAvailable())) redirect("/login");
  const needsCode = setupCodeRequired();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Logo className="mx-auto size-28" />
          <h1 className="mt-4 font-brand text-3xl tracking-wide text-bone">Ersteinrichtung</h1>
          <p className="mt-2 text-sm text-ash">
            Lege den ersten Account an. Als IT oder President hat er alle Rechte und kann danach alle weiteren Mitglieder aufnehmen.
            Die Clubregeln werden mit den Startinhalten gefüllt.
          </p>
        </div>
        <Card className="border-t-2 border-t-blood">
          <CardBody className="p-5 sm:p-6">
            <ActionForm action={setupAction} className="space-y-4">
              {needsCode && (
                <Field name="setupCode" label="Einrichtungscode" hint="Steht in der Umgebungsvariable SETUP_CODE.">
                  <Input name="setupCode" autoComplete="off" required />
                </Field>
              )}
              <Field name="name" label="Name (Charakter)">
                <Input name="name" maxLength={80} required />
              </Field>
              <Field name="role" label="Rang" hint="IT: technischer Admin mit allen Rechten. President: Clubchef mit allen Rechten.">
                <Select name="role" defaultValue="IT">
                  <option value="IT">IT</option>
                  <option value="PRESIDENT">President</option>
                </Select>
              </Field>
              <Field name="username" label="Benutzername" hint="Kleinbuchstaben, Ziffern, . _ -">
                <Input name="username" autoCapitalize="none" spellCheck={false} maxLength={30} required />
              </Field>
              <Field name="password" label="Passwort" hint={`Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`}>
                <Input name="password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} required />
              </Field>
              <Field name="confirmPassword" label="Passwort wiederholen">
                <Input name="confirmPassword" type="password" autoComplete="new-password" required />
              </Field>
              <SubmitButton className="w-full" pendingText="Richte ein …">
                Einrichten
              </SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
