import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Kennzahl-Kachel: Bezeichnung, Wert, optional Zusatzzeile. */
export function Stat({
  label,
  value,
  sub,
  icon,
  accent = false,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-line bg-panel/90 p-4 shadow-lg shadow-black/30",
        accent && "border-blood/50 bg-gradient-to-br from-blood/20 via-panel to-panel",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-xs uppercase tracking-wider text-ash">{label}</p>
        {icon && <span className="text-ash/70">{icon}</span>}
      </div>
      <p className={cn("mt-2 font-display text-2xl font-semibold tracking-wide text-bone", accent && "text-3xl")}>{value}</p>
      {sub && <div className="mt-1 text-xs text-ash">{sub}</div>}
    </div>
  );
}
