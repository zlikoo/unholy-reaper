import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-6 py-12 text-center">
      {icon && <div className="text-ash/60">{icon}</div>}
      <p className="font-display text-sm uppercase tracking-wider text-bone">{title}</p>
      {children && <div className="max-w-md text-sm text-ash">{children}</div>}
    </div>
  );
}

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-blood/40 bg-blood/10 p-8 text-center">
      <ShieldX className="mx-auto mb-3 size-10 text-blood-bright" aria-hidden />
      <h1 className="font-display text-xl uppercase tracking-wider text-bone">Kein Zugriff</h1>
      <p className="mt-2 text-sm text-ash">{message ?? "Für diesen Bereich reicht dein Rang nicht aus."}</p>
      <Link href="/" className="mt-4 inline-block text-sm text-red-300 underline-offset-4 hover:underline">
        Zurück zum Dashboard
      </Link>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-ash transition-colors hover:text-bone">
      <ArrowLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}

/** Beschriftete Zeile für Detailansichten. */
export function DetailItem({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="font-display text-[11px] uppercase tracking-wider text-ash">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-bone">{children}</dd>
    </div>
  );
}

/** Kennzeichen im Stil eines Nummernschilds. */
export function Plate({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded border border-bone/30 bg-bone/90 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-[0.15em] text-ink shadow-inner">
      {children}
    </span>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-blood/50 bg-blood/15 text-red-200",
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    info: "border-brass/40 bg-brass/10 text-amber-100",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-md border px-3 py-2 text-sm", styles[tone])}>
      {children}
    </div>
  );
}
