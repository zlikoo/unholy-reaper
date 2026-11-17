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
import { getLockerOptions, movementWhere, weaponWhere } from "@/features/lockers/access";
import { getMemberOptions } from "@/features/members/queries";
import {
  deleteWeaponAction,
  foundWeaponAction,
  issueWeaponAction,
  lostWeaponAction,
  returnWeaponAction,
  updateWeaponAction,
} from "@/features/weapons/actions";
import { IssueForm, LostForm, ReturnForm, WeaponEditForm } from "@/features/weapons/components/weapon-forms";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { memberDisplayName, ROLES, WEAPON_MOVEMENT_LABELS, WEAPON_STATUS_LABELS, WEAPON_STATUS_TONES } from "@/lib/labels";

export const metadata: Metadata = { title: "Waffe" };

const person = { select: { id: true, name: true, roadName: true } } as const;

export default async function WeaponPage({ params }: PageProps<"/waffenlager/[id]">) {
  const user = await requireUser();
  if (!can(user.role, "club.view")) return <AccessDenied />;
  const { id } = await params;

  const weapon = await db.weapon.findFirst({
    where: { AND: [{ id }, weaponWhere(user.role)] },
    include: { holder: person, locker: { select: { id: true, name: true, number: true, location: true } } },
  });
  if (!weapon) notFound();

  const canEdit = can(user.role, "weapons.edit");
  const [history, lockers, members, lastIssue] = await Promise.all([
    // Historie über alle Posten mit gleicher Waffe und Seriennummer (Posten werden geteilt/zusammengeführt)
    db.weaponMovement.findMany({
      where: { AND: [{ weaponName: weapon.name, serialNumber: weapon.serialNumber }, movementWhere(user.role)] },
      include: { member: person, performedBy: person },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 40,
    }),
    canEdit ? getLockerOptions(user.role) : Promise.resolve([]),
    canEdit && weapon.status === "IN_STOCK"
      ? getMemberOptions({ roles: ROLES.filter((r) => r !== "HANGAROUND") })
      : Promise.resolve([]),
    weapon.status === "ISSUED"
      ? db.weaponMovement.findFirst({ where: { weaponId: weapon.id, type: "ISSUE" }, orderBy: { date: "desc" } })
      : Promise.resolve(null),
  ]);
  const returnLocker = lastIssue?.lockerId && lockers.some((l) => l.id === lastIssue.lockerId) ? lastIssue.lockerId : undefined;

  return (
    <>
      <PageHeader
        title={weapon.name}
        description={weapon.serialNumber ? `Seriennummer ${weapon.serialNumber}` : "Ohne Seriennummer"}
        back={<BackLink href="/waffenlager">Zum Waffenlager</BackLink>}
        actions={<Badge tone={WEAPON_STATUS_TONES[weapon.status]}>{WEAPON_STATUS_LABELS[weapon.status]}</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Posten" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-4">
                <DetailItem label="Menge">
                  <span className="font-display text-2xl">{weapon.quantity}</span>
                </DetailItem>
                <DetailItem label="Status">{WEAPON_STATUS_LABELS[weapon.status]}</DetailItem>
                {weapon.status === "IN_STOCK" && (
                  <DetailItem label="Schließfach" className="col-span-2">
                    {weapon.locker ? (
                      <Link href={`/schliessfaecher/${weapon.locker.id}`} className="hover:text-red-300">
                        {weapon.locker.number ? `Fach ${weapon.locker.number} · ` : ""}
                        {weapon.locker.name}
                        {weapon.locker.location && <span className="block text-xs text-ash">{weapon.locker.location}</span>}
                      </Link>
                    ) : (
                      "Ohne Schließfach"
                    )}
                  </DetailItem>
                )}
                {weapon.holder && (
                  <DetailItem label={weapon.status === "LOST" ? "Zuletzt bei" : "Ausgegeben an"}>
                    <Link href={`/mitglieder/${weapon.holder.id}`} className="hover:text-red-300">
                      {memberDisplayName(weapon.holder)}
                    </Link>
                  </DetailItem>
                )}
                {weapon.issuedAt && weapon.status === "ISSUED" && (
                  <DetailItem label="Ausgegeben am">{formatDateTime(weapon.issuedAt)}</DetailItem>
                )}
                <DetailItem label="Notizen" className="col-span-2">
                  <span className="whitespace-pre-line">{weapon.notes ?? "–"}</span>
                </DetailItem>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Historie" description="Alle Bewegungen dieser Waffe" />
            <ol className="divide-y divide-line/60">
              {history.length === 0 && <li className="px-5 py-3 text-sm text-ash">Keine Einträge.</li>}
              {history.map((m) => (
                <li key={m.id} className="px-5 py-3 text-sm">
                  <p className="text-bone">
                    {WEAPON_MOVEMENT_LABELS[m.type]} · {m.quantity}×
                    {m.member && (
                      <span className="text-ash">
                        {" "}
                        {m.type === "ISSUE" ? "an" : m.type === "RETURN" ? "von" : "bei"} {memberDisplayName(m.member)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ash">
                    {formatDateTime(m.date)}
                    {m.lockerName && ` · ${m.type === "ISSUE" || m.type === "LOST" ? "aus" : "in"} ${m.lockerName}`}
                    {m.performedBy && ` · eingetragen von ${m.performedBy.roadName ?? m.performedBy.name}`}
                  </p>
                  {m.note && <p className="mt-0.5 text-xs italic text-ash">„{m.note}“</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {canEdit && (
          <div className="space-y-6 xl:col-span-3">
            {weapon.status === "IN_STOCK" && (
              <Card className="border-t-2 border-t-brass/60">
                <CardHeader title="Ausgeben" description="Bei einer Teilmenge wird der Posten aufgeteilt." />
                <CardBody>
                  <IssueForm action={issueWeaponAction.bind(null, weapon.id)} max={weapon.quantity} members={members} />
                </CardBody>
              </Card>
            )}
            {weapon.status === "ISSUED" && (
              <Card className="border-t-2 border-t-emerald-500/50">
                <CardHeader title="Rückgabe" description="Zurück ins Lager, ganz oder teilweise." />
                <CardBody>
                  <ReturnForm
                    action={returnWeaponAction.bind(null, weapon.id)}
                    max={weapon.quantity}
                    lockers={lockers}
                    defaultLockerId={returnLocker}
                    submitLabel="Zurücknehmen"
                  />
                </CardBody>
              </Card>
            )}
            {weapon.status === "LOST" && (
              <Card>
                <CardHeader title="Wiedergefunden" description="Zurück ins Lager buchen." />
                <CardBody>
                  <ReturnForm
                    action={foundWeaponAction.bind(null, weapon.id)}
                    max={weapon.quantity}
                    lockers={lockers}
                    submitLabel="Wieder einlagern"
                  />
                </CardBody>
              </Card>
            )}
            {weapon.status !== "LOST" && (
              <Card>
                <CardHeader title="Verloren melden" description="Beschlagnahmt, gestohlen oder anders abhandengekommen." />
                <CardBody>
                  <LostForm action={lostWeaponAction.bind(null, weapon.id)} max={weapon.quantity} />
                </CardBody>
              </Card>
            )}
            <Card>
              <CardHeader
                title="Bearbeiten"
                actions={
                  can(user.role, "weapons.delete") && (
                    <ActionButton
                      action={deleteWeaponAction.bind(null, weapon.id)}
                      confirmMessage={`Posten ${weapon.quantity}× ${weapon.name} endgültig löschen? Die Historie bleibt erhalten.`}
                      variant="danger"
                    >
                      <Trash2 className="size-3.5" /> Löschen
                    </ActionButton>
                  )
                }
              />
              <CardBody>
                <WeaponEditForm action={updateWeaponAction.bind(null, weapon.id)} weapon={weapon} lockers={lockers} />
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
