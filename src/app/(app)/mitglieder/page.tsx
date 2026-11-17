import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterForm, FilterSelect, SearchInput } from "@/components/ui/filter-form";
import { EmptyState } from "@/components/ui/misc";
import { AccessDenied } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, TR } from "@/components/ui/table";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { db } from "@/lib/db";
import { textContains } from "@/lib/search";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS, ROLE_TONES, ROLES } from "@/lib/labels";
import { getParam, pickEnum } from "@/lib/search-params";

export const metadata: Metadata = { title: "Mitglieder" };

const STATUS_OPTIONS = [
  { value: "aktiv", label: "Aktiv" },
  { value: "inaktiv", label: "Inaktiv" },
];

export default async function MembersPage({ searchParams }: PageProps<"/mitglieder">) {
  const user = await requireUser();
  if (!can(user.role, "club.view")) return <AccessDenied />;
  const params = await searchParams;
  const q = getParam(params, "q");
  const role = pickEnum(getParam(params, "rang"), ROLES);
  const status = getParam(params, "status");

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(status === "aktiv" ? { active: true } : status === "inaktiv" ? { active: false } : {}),
    ...(q
      ? { OR: [{ name: textContains(q) }, { roadName: textContains(q) }, { username: textContains(q) }] }
      : {}),
  };

  const members = (
    await db.user.findMany({ where, include: { sponsor: { select: { name: true, roadName: true } } } })
  ).sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      ROLES.indexOf(a.role) - ROLES.indexOf(b.role) ||
      a.joinedAt.getTime() - b.joinedAt.getTime(),
  );
  const activeCount = members.filter((m) => m.active).length;

  return (
    <>
      <PageHeader
        title="Mitglieder"
        description={`${activeCount} aktiv, ${members.length - activeCount} inaktiv${q || role || status ? " (gefiltert)" : ""}.`}
        actions={
          can(user.role, "members.manage") && (
            <LinkButton href="/mitglieder/neu">
              <UserPlus className="size-4" /> Mitglied aufnehmen
            </LinkButton>
          )
        }
      />

      <FilterForm action="/mitglieder" className="mb-4">
        <SearchInput defaultValue={q} placeholder="Name, Road Name oder Benutzername" />
        <FilterSelect name="rang" label="Rang" defaultValue={role} options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
        <FilterSelect name="status" label="Status" defaultValue={status} options={STATUS_OPTIONS} />
      </FilterForm>

      {members.length === 0 ? (
        <EmptyState title="Keine Mitglieder gefunden" icon={<Users className="size-8" />}>
          Passe die Suche oder die Filter an.
        </EmptyState>
      ) : (
        <>
          {/* Handy: Karten */}
          <div className="grid gap-3 md:hidden">
            {members.map((m) => (
              <Link key={m.id} href={`/mitglieder/${m.id}`} className="block">
                <Card className={m.active ? "p-4" : "p-4 opacity-60"}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-bone">
                        {m.name}
                        {m.roadName && <span className="text-brass"> „{m.roadName}“</span>}
                      </p>
                      <p className="text-xs text-ash">
                        @{m.username} · seit {formatDate(m.joinedAt)}
                        {m.sponsor && <> · Sponsor: {m.sponsor.roadName ?? m.sponsor.name}</>}
                      </p>
                    </div>
                    <Badge tone={ROLE_TONES[m.role]}>{ROLE_LABELS[m.role]}</Badge>
                  </div>
                  {!m.active && <p className="mt-2 text-xs uppercase tracking-wider text-ash">Inaktiv</p>}
                  {m.notes && <p className="mt-2 line-clamp-2 text-sm text-ash">{m.notes}</p>}
                </Card>
              </Link>
            ))}
          </div>

          {/* Desktop: Tabelle */}
          <Card className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <TH>Name</TH>
                  <TH>Rang</TH>
                  <TH>Beigetreten</TH>
                  <TH>Status</TH>
                  <TH>Notizen</TH>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <TR key={m.id} className={m.active ? "" : "opacity-55"}>
                    <TD>
                      <Link href={`/mitglieder/${m.id}`} className="font-medium text-bone hover:text-red-300">
                        {m.name}
                        {m.roadName && <span className="text-brass"> „{m.roadName}“</span>}
                      </Link>
                      <div className="text-xs text-ash">
                        @{m.username}
                        {m.sponsor && <> · Sponsor: {m.sponsor.roadName ?? m.sponsor.name}</>}
                      </div>
                    </TD>
                    <TD>
                      <Badge tone={ROLE_TONES[m.role]}>{ROLE_LABELS[m.role]}</Badge>
                    </TD>
                    <TD className="whitespace-nowrap text-ash">{formatDate(m.joinedAt)}</TD>
                    <TD>{m.active ? <Badge tone="green">Aktiv</Badge> : <Badge tone="zinc">Inaktiv</Badge>}</TD>
                    <TD className="max-w-xs truncate text-ash" title={m.notes ?? undefined}>
                      {m.notes ?? "–"}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
