import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, MapPin, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AccessDenied, EmptyState } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { lockerWhere } from "@/features/lockers/access";
import { LockerSecrets } from "@/features/lockers/components/locker-secrets";
import { db } from "@/lib/db";
import { ROLE_LABELS, ROLE_TONES, ROLES } from "@/lib/labels";

export const metadata: Metadata = { title: "Schließfächer" };

export default async function LockersPage() {
  const user = await requireUser();
  if (!can(user.role, "club.view")) return <AccessDenied />;

  const lockers = await db.locker.findMany({
    where: lockerWhere(user.role),
    include: {
      access: true,
      weapons: { where: { status: "IN_STOCK" }, select: { name: true, quantity: true } },
    },
    orderBy: [{ number: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Schließfächer"
        description="Die Waffenlager auf dem Server. Du siehst nur die Fächer, die für deinen Rang freigegeben sind."
        actions={
          can(user.role, "lockers.manage") && (
            <LinkButton href="/schliessfaecher/neu">
              <Plus className="size-4" /> Fach anlegen
            </LinkButton>
          )
        }
      />

      {lockers.length === 0 ? (
        <EmptyState title="Keine Schließfächer sichtbar" icon={<KeyRound className="size-8" />}>
          Für deinen Rang ist kein Fach freigegeben.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lockers.map((locker) => {
            const itemCount = locker.weapons.reduce((sum, w) => sum + w.quantity, 0);
            const roles = ROLES.filter((r) => locker.access.some((a) => a.role === r));
            return (
              <Card key={locker.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                  <Link href={`/schliessfaecher/${locker.id}`} className="min-w-0">
                    <p className="font-display text-xs uppercase tracking-[0.25em] text-brass">
                      {locker.number ? `Fach ${locker.number}` : "Fach"}
                    </p>
                    <h2 className="truncate font-display text-lg uppercase tracking-wide text-bone hover:text-red-300">{locker.name}</h2>
                    {locker.location && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ash">
                        <MapPin className="size-3.5 shrink-0" aria-hidden /> {locker.location}
                      </p>
                    )}
                  </Link>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brass/40 bg-brass/10">
                    <KeyRound className="size-5 text-brass" aria-hidden />
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-4 px-5 py-4">
                  <LockerSecrets lockerId={locker.id} hasCode={Boolean(locker.codeEncrypted)} hasPassword={Boolean(locker.passwordEncrypted)} />
                  <div className="text-sm">
                    <p className="text-ash">
                      Inhalt: <span className="text-bone">{itemCount} Stück</span> in {locker.weapons.length} Posten
                    </p>
                    {locker.weapons.length > 0 && (
                      <p className="mt-1 line-clamp-2 text-xs text-ash">
                        {locker.weapons.map((w) => `${w.quantity}× ${w.name}`).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    {roles.map((r) => (
                      <Badge key={r} tone={ROLE_TONES[r]}>
                        {ROLE_LABELS[r]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
