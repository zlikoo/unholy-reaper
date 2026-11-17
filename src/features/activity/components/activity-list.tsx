import type { ActivityLog } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatRelative } from "@/lib/format";
import { LOG_ENTITY_LABELS, type BadgeTone, type LogEntity } from "@/lib/labels";

const ENTITY_TONES: Record<string, BadgeTone> = {
  TRANSACTION: "brass",
  VEHICLE: "blue",
  WEAPON: "red",
  LOCKER: "red",
  MEMBER: "bone",
  POST: "zinc",
  RULES: "zinc",
  SETTINGS: "amber",
};

type Entry = ActivityLog & { user: { name: string; roadName: string | null } | null };

function parseDetails(details: string | null): Array<[string, [string, string]]> {
  if (!details) return [];
  try {
    return Object.entries(JSON.parse(details) as Record<string, [string, string]>);
  } catch {
    return [];
  }
}

export function ActivityList({ entries, showDetails = true }: { entries: Entry[]; showDetails?: boolean }) {
  return (
    <ul className="divide-y divide-line/60">
      {entries.map((entry) => {
        const details = showDetails ? parseDetails(entry.details) : [];
        return (
          <li key={entry.id} className="px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ash">
              <Badge tone={ENTITY_TONES[entry.entityType] ?? "zinc"}>
                {LOG_ENTITY_LABELS[entry.entityType as LogEntity] ?? entry.entityType}
              </Badge>
              <span className="text-bone">{entry.user ? (entry.user.roadName ?? entry.user.name) : "System"}</span>
              <span title={formatDateTime(entry.createdAt)}>· {formatRelative(entry.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-bone/90">{entry.summary}</p>
            {details.length > 0 && (
              <details className="mt-1.5">
                <summary className="cursor-pointer text-xs text-ash hover:text-bone">Änderungen anzeigen</summary>
                <table className="mt-2 w-full max-w-2xl text-left text-xs">
                  <thead className="text-ash">
                    <tr>
                      <th className="py-1 pr-3 font-normal">Feld</th>
                      <th className="py-1 pr-3 font-normal">Vorher</th>
                      <th className="py-1 font-normal">Nachher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map(([field, [before, after]]) => (
                      <tr key={field} className="border-t border-line/50 align-top">
                        <td className="py-1 pr-3 text-ash">{field}</td>
                        <td className="py-1 pr-3 text-red-300/80 line-through decoration-1">{before}</td>
                        <td className="py-1 text-emerald-300">{after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
