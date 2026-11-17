import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Card } from "@/components/ui/card";
import { FilterForm, FilterSelect, SearchInput } from "@/components/ui/filter-form";
import { AccessDenied, EmptyState } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/table";
import { ActivityList } from "@/features/activity/components/activity-list";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { db } from "@/lib/db";
import { textContains } from "@/lib/search";
import { LOG_ENTITIES, LOG_ENTITY_LABELS, memberDisplayName } from "@/lib/labels";
import { getPage, getParam, pickEnum } from "@/lib/search-params";

export const metadata: Metadata = { title: "Aktivitätslog" };

const PAGE_SIZE = 50;

export default async function LogPage({ searchParams }: PageProps<"/log">) {
  const user = await requireUser();
  if (!can(user.role, "log.view")) {
    return <AccessDenied message="Das Log sehen nur Sergeant at Arms, Vice President und President." />;
  }

  const params = await searchParams;
  const q = getParam(params, "q");
  const area = pickEnum(getParam(params, "bereich"), LOG_ENTITIES);
  const page = getPage(params);
  const members = await db.user.findMany({ select: { id: true, name: true, roadName: true }, orderBy: { name: "asc" } });
  const memberId = pickEnum(getParam(params, "mitglied"), members.map((m) => m.id));

  const where: Prisma.ActivityLogWhereInput = {
    ...(area ? { entityType: area } : {}),
    ...(memberId ? { userId: memberId } : {}),
    ...(q ? { summary: textContains(q) } : {}),
  };
  const [total, entries] = await Promise.all([
    db.activityLog.count({ where }),
    db.activityLog.findMany({
      where,
      include: { user: { select: { name: true, roadName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Aktivitätslog"
        description={`Jede Änderung an Kasse, Fahrzeugen, Waffen, Schließfächern, Rängen und Regeln, mit Benutzer und Zeit. ${total} Einträge${q || area || memberId ? " (gefiltert)" : ""}.`}
      />
      <FilterForm action="/log" className="mb-4">
        <SearchInput defaultValue={q} placeholder="Im Log suchen" />
        <FilterSelect name="bereich" label="Bereich" defaultValue={area} options={LOG_ENTITIES.map((e) => ({ value: e, label: LOG_ENTITY_LABELS[e] }))} />
        <FilterSelect name="mitglied" label="Mitglied" defaultValue={memberId} options={members.map((m) => ({ value: m.id, label: memberDisplayName(m) }))} />
      </FilterForm>
      {entries.length === 0 ? (
        <EmptyState title="Keine Einträge" icon={<ScrollText className="size-8" />} />
      ) : (
        <Card>
          <ActivityList entries={entries} />
          <Pagination
            basePath="/log"
            params={{ q, bereich: area ?? "", mitglied: memberId ?? "" }}
            page={page}
            totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          />
        </Card>
      )}
    </>
  );
}
