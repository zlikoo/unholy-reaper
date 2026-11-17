import { cn } from "@/lib/utils";

/** Club-Logo aus public/logo.png. Zum Austauschen einfach die Datei ersetzen. */
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="Unholy Reaper MC" className={cn("object-contain", className)} />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("leading-none", className)}>
      <div className="font-brand text-lg tracking-wide text-bone">Unholy Reaper</div>
      <div className="mt-1 font-display text-[10px] uppercase tracking-[0.3em] text-brass">MC · Blaine County</div>
    </div>
  );
}
