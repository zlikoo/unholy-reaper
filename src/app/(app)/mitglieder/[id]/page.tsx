import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { BackLink, DetailItem, Plate } from "@/components/ui/misc";
import { AccessDenied } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { assignableRoles, can, canChangeRanks, canEditMember, SPONSOR_ROLES } from "@/features/auth/permissions";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/password";
import { requireUser } from "@/features/auth/session";
import { resetMemberPasswordAction, updateMemberAction } from "@/features/members/actions";
import { MemberForm } from "@/features/members/components/member-form";
import { getMemberOptions } from "@/features/members/queries";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import {
  memberDisplayName,
  ROLE_LABELS,
  ROLES,
  ROLE_TONES,
  TRANSACTION_TYPE_LABELS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_TONES,
  WEAPON_STATUS_LABELS,
  WEAPON_STATUS_TONES,
} from "@/lib/labels";

export const metadata: Metadata = { title: "Mitglied" };

export default async function MemberPage({ params }: PageProps<"/mitglieder/[id]">) {
  const user = await requireUser();
  if (!can(user.role, "club.view")) return <AccessDenied />;
  const { id } = await params;

  const member = await db.user.findUnique({
    where: { id },
    include: {
      sponsor: { select: { id: true, name: true, roadName: true } },
      sponsored: { select: { id: true, name: true, roadName: true, role: true }, where: { active: true } },
      vehicles: { orderBy: { model: "asc" } },
      weaponsHeld: { where: { status: { in: ["ISSUED", "LOST"] } }, orderBy: { issuedAt: "desc" } },
      transactions: { where: { status: "APPROVED" }, orderBy: { date: "desc" }, take: 5 },
    },
  });
  if (!member) notFound();

  const canManage = can(user.role, "members.accounts");
  const isSelf = member.id === user.id;
  const editable = canManage && canEditMember(user.role, member.role);
  const issuedWeapons = member.weaponsHeld.filter((w) => w.status === "ISSUED");

  return (
    <>
      <PageHeader
        title={member.roadName ?? member.name}
        description={member.roadName ? member.name : undefined}
        back={<BackLink href="/mitglieder">Alle Mitglieder</BackLink>}
        actions={
          <div className="flex gap-2">
            <Badge tone={ROLE_TONES[member.role]}>{ROLE_LABELS[member.role]}</Badge>
            {member.active ? <Badge tone="green">Aktiv</Badge> : <Badge tone="zinc">Inaktiv</Badge>}
          </div>
        }
      />

      <div className={editable ? "grid gap-6 xl:grid-cols-3" : "grid gap-6 md:grid-cols-2"}>
        <div className={editable ? "space-y-6 xl:col-span-1" : "contents"}>
          <Card>
            <CardHeader title="Steckbrief" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-4">
                <DetailItem label="Name">{member.name}</DetailItem>
                <DetailItem label="Road Name">{member.roadName ?? "–"}</DetailItem>
                <DetailItem label="Benutzername">@{member.username}</DetailItem>
                <DetailItem label="Beigetreten">{formatDate(member.joinedAt)}</DetailItem>
                <DetailItem label="Sponsor">
                  {member.sponsor ? (
                    <Link href={`/mitglieder/${member.sponsor.id}`} className="hover:text-red-300">
                      {memberDisplayName(member.sponsor)}
                    </Link>
                  ) : (
                    "–"
                  )}
                </DetailItem>
                {member.sponsored.length > 0 && (
                  <DetailItem label="Sponsor für" className="col-span-2">
                    {member.sponsored.map((s, i) => (
                      <span key={s.id}>
                        {i > 0 && ", "}
                        <Link href={`/mitglieder/${s.id}`} className="hover:text-red-300">
                          {memberDisplayName(s)}
                        </Link>{" "}
                        <span className="text-xs text-ash">({ROLE_LABELS[s.role]})</span>
                      </span>
                    ))}
                  </DetailItem>
                )}
                <DetailItem label="Notizen" className="col-span-2">
                  <span className="whitespace-pre-line">{member.notes ?? "–"}</span>
                </DetailItem>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Fahrzeuge" description={`${member.vehicles.length} eingetragen`} />
            <ul className="divide-y divide-line/60">
              {member.vehicles.length === 0 && <li className="px-5 py-3 text-sm text-ash">Keine eigenen Fahrzeuge.</li>}
              {member.vehicles.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 px-5 py-3">
                  <Link href={`/fahrzeuge/${v.id}`} className="min-w-0 text-sm text-bone hover:text-red-300">
                    <span className="block truncate">{v.model}</span>
                    <Plate>{v.plate}</Plate>
                  </Link>
                  <Badge tone={VEHICLE_STATUS_TONES[v.status]}>{VEHICLE_STATUS_LABELS[v.status]}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Ausrüstung" description={`${issuedWeapons.length} Posten ausgegeben`} />
            <ul className="divide-y divide-line/60">
              {member.weaponsHeld.length === 0 && <li className="px-5 py-3 text-sm text-ash">Nichts ausgegeben.</li>}
              {member.weaponsHeld.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 px-5 py-3">
                  <Link href={`/waffenlager/${w.id}`} className="min-w-0 text-sm text-bone hover:text-red-300">
                    {w.quantity}× {w.name}
                    {w.serialNumber && <span className="block text-xs text-ash">SN {w.serialNumber}</span>}
                  </Link>
                  <Badge tone={WEAPON_STATUS_TONES[w.status]}>{WEAPON_STATUS_LABELS[w.status]}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Letzte Kassenbuchungen" />
            <ul className="divide-y divide-line/60">
              {member.transactions.length === 0 && <li className="px-5 py-3 text-sm text-ash">Keine Buchungen.</li>}
              {member.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-bone">{t.description}</span>
                    <span className="text-xs text-ash">
                      {TRANSACTION_TYPE_LABELS[t.type]} · {formatDate(t.date)}
                    </span>
                  </span>
                  <span className={t.type === "DEPOSIT" ? "text-emerald-300" : "text-red-300"}>
                    {t.type === "DEPOSIT" ? "+" : "−"} {formatMoney(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {editable && (
          <div className="space-y-6 xl:col-span-2">
            <Card>
              <CardHeader title="Bearbeiten" description="Rang, Status und Stammdaten. Jede Änderung wird protokolliert." />
              <CardBody>
                <MemberForm
                  action={updateMemberAction.bind(null, member.id)}
                  member={member}
                  assignableRoles={assignableRoles(user.role, ROLES)}
                  rankLocked={!canChangeRanks(user.role)}
                  sponsors={await getMemberOptions({ roles: SPONSOR_ROLES, include: [member.sponsorId] })}
                  isSelf={isSelf}
                  submitLabel="Speichern"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Passwort zurücksetzen"
                description="Falls das Mitglied sein Passwort vergessen hat. Es wird auf allen Geräten abgemeldet."
              />
              <CardBody>
                <ActionForm action={resetMemberPasswordAction.bind(null, member.id)} resetOnSuccess className="flex flex-wrap items-start gap-3">
                  <Field name="password" label="Neues Passwort" className="min-w-60 flex-1">
                    <Input name="password" type="text" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} required />
                  </Field>
                  <SubmitButton variant="secondary" className="sm:mt-5">
                    Passwort setzen
                  </SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
