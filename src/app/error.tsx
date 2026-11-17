"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-brand text-3xl text-bone">Etwas ist schiefgelaufen</h1>
      <p className="max-w-sm text-sm text-ash">
        Der Vorgang konnte nicht abgeschlossen werden. Versuch es noch einmal.
        {error.digest && <span className="mt-2 block font-mono text-xs">Fehler-ID: {error.digest}</span>}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-blood px-4 py-2 font-display text-sm uppercase tracking-wider text-white hover:bg-blood-bright"
      >
        Neu laden
      </button>
    </main>
  );
}
