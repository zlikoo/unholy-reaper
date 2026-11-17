import type { ReactNode } from "react";
import type { BadgeTone } from "@/lib/labels";
import { cn } from "@/lib/utils";

const tones: Record<BadgeTone, string> = {
  red: "bg-blood/20 text-red-300 ring-blood/50",
  green: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  zinc: "bg-zinc-500/10 text-zinc-300 ring-zinc-500/30",
  brass: "bg-brass/10 text-brass ring-brass/40",
  blue: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
  bone: "bg-bone/10 text-bone ring-bone/30",
};

export function Badge({ tone = "zinc", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 font-display text-[11px] font-medium uppercase tracking-wider ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
