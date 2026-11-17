import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo className="size-28 opacity-80" />
      <h1 className="font-brand text-3xl text-bone">Nicht gefunden</h1>
      <p className="max-w-sm text-sm text-ash">Diese Seite gibt es nicht, oder sie ist für deinen Rang nicht sichtbar.</p>
      <Link href="/" className="text-sm text-red-300 underline-offset-4 hover:underline">
        Zurück zum Dashboard
      </Link>
    </main>
  );
}
