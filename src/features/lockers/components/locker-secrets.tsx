"use client";

import { useState, useTransition } from "react";
import { Copy, Eye, EyeOff, KeyRound } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { revealLockerSecretsAction, type RevealResult } from "../actions";

function SecretValue({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-line bg-ink/70 px-3 py-2">
      <div className="min-w-0">
        <p className="font-display text-[10px] uppercase tracking-wider text-ash">{label}</p>
        <p className="truncate font-mono text-lg tracking-[0.2em] text-bone">{value ?? "–"}</p>
      </div>
      {value && (
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded p-2 text-ash hover:bg-panel-2 hover:text-bone"
          aria-label={`${label} kopieren`}
          title="Kopieren"
        >
          {copied ? <span className="text-xs text-emerald-300">Kopiert</span> : <Copy className="size-4" />}
        </button>
      )}
    </div>
  );
}

/** Zeigt PIN und Passwort erst nach Klick. Jeder Abruf wird im Log vermerkt. */
export function LockerSecrets({ lockerId, hasCode, hasPassword }: { lockerId: string; hasCode: boolean; hasPassword: boolean }) {
  const [result, setResult] = useState<RevealResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hasCode && !hasPassword) {
    return <p className="text-sm text-ash">Keine PIN und kein Passwort hinterlegt.</p>;
  }

  if (result?.ok) {
    return (
      <div className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          {hasCode && <SecretValue label="PIN" value={result.code} />}
          {hasPassword && <SecretValue label="Passwort" value={result.password} />}
        </div>
        <button type="button" onClick={() => setResult(null)} className={buttonClasses("ghost", "sm")}>
          <EyeOff className="size-3.5" /> Verbergen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-sm text-ash">
        <KeyRound className="size-4 text-brass" aria-hidden />
        <span className="font-mono tracking-[0.3em]">••••</span>
        <span className="text-xs">Abruf wird protokolliert</span>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await revealLockerSecretsAction(lockerId)))}
        className={buttonClasses("secondary", "sm")}
      >
        <Eye className="size-3.5" /> {pending ? "Lade …" : hasPassword ? "PIN & Passwort anzeigen" : "PIN anzeigen"}
      </button>
      {result && !result.ok && <p className="text-xs text-red-300">{result.error}</p>}
    </div>
  );
}
