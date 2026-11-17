import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { Card, CardBody } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUser } from "@/features/auth/session";
import { setupAvailable } from "@/features/setup/status";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  // Leere Datenbank: zuerst die Ersteinrichtung
  if (await setupAvailable()) redirect("/setup");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Logo className="mx-auto size-40 drop-shadow-[0_0_30px_rgb(181_18_27/0.35)] sm:size-48" />
          <h1 className="mt-4 font-brand text-3xl tracking-wide text-bone">Unholy Reaper</h1>
          <p className="mt-1 font-display text-xs uppercase tracking-[0.35em] text-brass">MC · Blaine County</p>
        </div>
        <Card className="border-t-2 border-t-blood">
          <CardBody className="p-5 sm:p-6">
            <LoginForm />
          </CardBody>
        </Card>
        <p className="mt-6 text-center text-xs text-ash/70">
          Nur für Mitglieder. Alle Inhalte sind fiktive In-Game-Daten eines Roleplay-Servers.
        </p>
      </div>
    </main>
  );
}
