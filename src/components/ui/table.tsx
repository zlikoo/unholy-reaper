import Link from "next/link";
import type { ComponentProps } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className={cn("w-full min-w-[640px] border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function TH({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "border-b border-line bg-panel-2/50 px-4 py-2.5 font-display text-[11px] font-medium uppercase tracking-wider text-ash",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("border-b border-line/60 px-4 py-3 align-middle", className)} {...props} />;
}

export function TR({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("transition-colors hover:bg-panel-2/40", className)} {...props} />;
}

/** Blättern zwischen Seiten, behält alle anderen Filter bei. */
export function Pagination({
  basePath,
  params,
  page,
  totalPages,
}: {
  basePath: string;
  params: Record<string, string>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const href = (target: number) => {
    const search = new URLSearchParams({ ...params, seite: String(target) });
    for (const [key, value] of [...search.entries()]) if (!value) search.delete(key);
    return `${basePath}?${search.toString()}`;
  };
  const linkClass =
    "inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm text-ash transition-colors hover:border-ash/50 hover:text-bone";
  return (
    <nav className="flex items-center justify-between gap-2 px-4 py-3" aria-label="Seiten">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass}>
          <ChevronLeft className="size-4" /> Zurück
        </Link>
      ) : (
        <span />
      )}
      <span className="text-xs text-ash">
        Seite {page} von {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={linkClass}>
          Weiter <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
