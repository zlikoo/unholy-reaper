import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/form";
import { AccessDenied, BackLink, DetailItem } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { lockerWhere } from "@/features/lockers/access";
import { deleteLockerAction, updateLockerAction } from "@/features/lockers/actions";
import { LockerForm } from "@/features/lockers/components/locker-form";
import { LockerSecrets } from "@/features/lockers/components/locker-secrets";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { memberDisplayName, ROLE_LABELS, ROLE_TONES, ROLES, WEAPON_MOVEMENT_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Schließfach" };

export default async function LockerPage({ params }: PageProps<"/schliessfaecher/[id]">) {
  const user = await requireUser();
  if (!can(user.role, "club.view")) return <AccessDenied />;
  const { id } = await params;

  // Fächer ohne Zugriff verhalten sich wie nicht vorhanden.
  const locker = await db.locker.findFirst({
    where: { AND: [{ id }, lockerWhere(user.role)] },
    include: {
      access: true,
      weapons: { where: { status: "IN_STOCK" }, orderBy: [{ name: "asc" }, { serialNumber: "asc" }] },
      movements: {
        orderBy: { date: "desc" },
        take: 15,
        include: { member: { select: { name: true, roadName: true } }, performedBy: { select: { name: true, roadName: true } } },
      },
    },
  });
  if (!locker) notFound();

  const roles = ROLES.filter((r) => locker.access.some((a) => a.role === r));
  const canManage = can(user.role, "lockers.manage");

  return (
    <>
      <PageHeader
        title={locker.name}
        description={locker.number ? `Fach ${locker.number}${locker.location ? ` · ${locker.location}` : ""}` : (locker.location ?? undefined)}
        back={<BackLink href="/schliessfaecher">Alle Schließfächer</BackLink>}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Zugang" />
            <CardBody className="space-y-4">
              <LockerSecrets lockerId={locker.id} hasCode={Boolean(locker.codeEncrypted)} hasPassword={Boolean(locker.passwordEncrypted)} />
              <dl className="grid grid-cols-2 gap-4">
                <DetailItem label="Sichtbar für" className="col-span-2">
                  <span className="flex flex-wrap gap-1.5">
                    {roles.map((r) => (
                      <Badge key={r} tone={ROLE_TONES[r]}>
                        {ROLE_LABELS[r]}
                      </Badge>
                    ))}
                  </span>
                </DetailItem>
                <DetailItem label="Notizen" className="col-span-2">
                  <span className="whitespace-pre-line">{locker.notes ?? "–"}</span>
                </DetailItem>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Inhalt" description={`${locker.weapons.reduce((s, w) => s + w.quantity, 0)} Stück im Fach`} />
            <ul className="divide-y divide-line/60">
              {locker.weapons.length === 0 && <li className="px-5 py-3 text-sm text-ash">Das Fach ist leer.</li>}
              {locker.weapons.map((w) => (
                <li key={w.id}>
                  <Link href={`/waffenlager/${w.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-panel-2/40">
                    <span className="min-w-0 text-sm text-bone">
                      {w.name}
                      {w.serialNumber && <span className="block text-xs text-ash">SN {w.serialNumber}</span>}
                    </span>
                    <span className="font-display text-lg text-bone">{w.quantity}×</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Letzte Bewegungen" />
            <ul className="divide-y divide-line/60">
              {locker.movements.length === 0 && <li className="px-5 py-3 text-sm text-ash">Noch keine Bewegungen.</li>}
              {locker.movements.map((m) => (
                <li key={m.id} className="px-5 py-3 text-sm">
                  <p className="text-bone">
                    {WEAPON_MOVEMENT_LABELS[m.type]}: {m.quantity}× {m.weaponName}
                    {m.member && <span className="text-ash"> · {memberDisplayName(m.member)}</span>}
                  </p>
                  <p className="text-xs text-ash">
                    {formatDateTime(m.date)}
                    {m.performedBy && ` · von ${m.performedBy.roadName ?? m.performedBy.name}`}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {canManage && (
          <Card className="self-start">
            <CardHeader
              title="Bearbeiten"
              actions={
                <ActionButton
                  action={deleteLockerAction.bind(null, locker.id)}
                  confirmMessage={`Schließfach „${locker.name}“ löschen?`}
                  variant="danger"
                >
                  <Trash2 className="size-3.5" /> Löschen
                </ActionButton>
              }
            />
            <CardBody>
              <LockerForm
                action={updateLockerAction.bind(null, locker.id)}
                currentRole={user.role}
                locker={{
                  name: locker.name,
                  number: locker.number,
                  location: locker.location,
                  notes: locker.notes,
                  hasCode: Boolean(locker.codeEncrypted),
                  hasPassword: Boolean(locker.passwordEncrypted),
                  roles,
                }}
                submitLabel="Speichern"
              />
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
