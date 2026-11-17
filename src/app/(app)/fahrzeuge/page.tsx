import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid, MapPin, Motorbike, Plus, Rows3 } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import type { VehicleStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterForm, FilterSelect, SearchInput } from "@/components/ui/filter-form";
import { ActionButton } from "@/components/ui/form";
import { EmptyState, Plate } from "@/components/ui/misc";
import { AccessDenied } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, TR } from "@/components/ui/table";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { quickVehicleStatusAction } from "@/features/vehicles/actions";
import { VehicleImage } from "@/features/vehicles/components/vehicle-image";
import { db } from "@/lib/db";
import { textContains } from "@/lib/search";
import {
  memberDisplayName,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_TONES,
  VEHICLE_STATUSES,
  VEHICLE_TYPE_LABELS,
  VEHICLE_TYPES,
} from "@/lib/labels";
import { getParam, pickEnum } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Fahrzeuge" };

function QuickStatus({ id, status }: { id: string; status: VehicleStatus }) {
  if (status === "IN_GARAGE") {
    return <ActionButton action={quickVehicleStatusAction.bind(null, id, "ON_ROAD")}>Auslagern</ActionButton>;
  }
  if (status === "ON_ROAD") {
    return <ActionButton action={quickVehicleStatusAction.bind(null, id, "IN_GARAGE")}>Einlagern</ActionButton>;
  }
  return null;
}

export default async function VehiclesPage({ searchParams }: PageProps<"/fahrzeuge">) {
  const user = await requireUser();
  if (!can(user.role, "club.view")) return <AccessDenied />;
  const params = await searchParams;
  const q = getParam(params, "q");
  const type = pickEnum(getParam(params, "typ"), VEHICLE_TYPES);
  const status = pickEnum(getParam(params, "status"), VEHICLE_STATUSES);
  const view = getParam(params, "ansicht") === "tabelle" ? "tabelle" : "karten";
  const canEdit = can(user.role, "vehicles.edit");

  const where: Prisma.VehicleWhereInput = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { model: textContains(q) },
            { plate: textContains(q) },
            { location: textContains(q) },
            { notes: textContains(q) },
            { owner: { is: { OR: [{ name: textContains(q) }, { roadName: textContains(q) }] } } },
          ],
        }
      : {}),
  };

  const [unsortedVehicles, totals] = await Promise.all([
    db.vehicle.findMany({
      where,
      include: { owner: { select: { id: true, name: true, roadName: true } } },
      orderBy: { model: "asc" },
    }),
    db.vehicle.groupBy({ by: ["status"], _count: true }),
  ]);
  // Motorräder zuerst, dann Autos, dann Sonstiges
  const vehicles = unsortedVehicles.sort((a, b) => VEHICLE_TYPES.indexOf(a.type) - VEHICLE_TYPES.indexOf(b.type));
  const countByStatus = Object.fromEntries(totals.map((t) => [t.status, t._count])) as Partial<Record<VehicleStatus, number>>;

  const viewHref = (target: string) => {
    const search = new URLSearchParams({ q, typ: type ?? "", status: status ?? "", ansicht: target });
    for (const [key, value] of [...search.entries()]) if (!value) search.delete(key);
    return `/fahrzeuge?${search.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Fahrzeuge"
        description="Bikes, Autos und alles andere mit Motor."
        actions={
          canEdit && (
            <LinkButton href="/fahrzeuge/neu">
              <Plus className="size-4" /> Fahrzeug eintragen
            </LinkButton>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {VEHICLE_STATUSES.map((s) => (
          <Badge key={s} tone={VEHICLE_STATUS_TONES[s]}>
            {VEHICLE_STATUS_LABELS[s]}: {countByStatus[s] ?? 0}
          </Badge>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <FilterForm action="/fahrzeuge" className="flex-1">
          <input type="hidden" name="ansicht" value={view} />
          <SearchInput defaultValue={q} placeholder="Modell, Kennzeichen, Besitzer, Standort" />
          <FilterSelect name="typ" label="Typ" defaultValue={type} options={VEHICLE_TYPES.map((t) => ({ value: t, label: VEHICLE_TYPE_LABELS[t] }))} />
          <FilterSelect
            name="status"
            label="Status"
            defaultValue={status}
            options={VEHICLE_STATUSES.map((s) => ({ value: s, label: VEHICLE_STATUS_LABELS[s] }))}
          />
        </FilterForm>
        <div className="flex rounded-md border border-line p-0.5" role="group" aria-label="Ansicht">
          {[
            { key: "karten", label: "Karten", Icon: LayoutGrid },
            { key: "tabelle", label: "Tabelle", Icon: Rows3 },
          ].map(({ key, label, Icon }) => (
            <Link
              key={key}
              href={viewHref(key)}
              aria-current={view === key ? "true" : undefined}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded px-3 font-display text-xs uppercase tracking-wider",
                view === key ? "bg-blood/20 text-bone" : "text-ash hover:text-bone",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          ))}
        </div>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState title="Keine Fahrzeuge gefunden" icon={<Motorbike className="size-8" />}>
          {q || type || status ? "Passe die Suche oder die Filter an." : "Noch keine Fahrzeuge eingetragen."}
        </EmptyState>
      ) : view === "karten" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((v) => (
            <Card key={v.id} className="flex flex-col overflow-hidden">
              <Link href={`/fahrzeuge/${v.id}`} className="group relative block">
                <VehicleImage src={v.imageUrl} type={v.type} alt={v.model} className="aspect-video w-full" />
                <div className="absolute left-3 top-3">
                  <Badge tone={VEHICLE_STATUS_TONES[v.status]} className="bg-ink/80 backdrop-blur">
                    {VEHICLE_STATUS_LABELS[v.status]}
                  </Badge>
                </div>
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/fahrzeuge/${v.id}`} className="min-w-0">
                    <h2 className="truncate font-display text-lg uppercase tracking-wide text-bone hover:text-red-300">{v.model}</h2>
                    <p className="text-xs text-ash">{VEHICLE_TYPE_LABELS[v.type]}</p>
                  </Link>
                  <Plate>{v.plate}</Plate>
                </div>
                <div className="space-y-1 text-sm text-ash">
                  <p>
                    Besitzer: <span className="text-bone">{v.owner ? memberDisplayName(v.owner) : "Club"}</span>
                  </p>
                  {v.location && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0" aria-hidden /> {v.location}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <div className="mt-auto pt-1">
                    <QuickStatus id={v.id} status={v.status} />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <TH>Modell</TH>
                <TH>Kennzeichen</TH>
                <TH>Typ</TH>
                <TH>Besitzer</TH>
                <TH>Status</TH>
                <TH>Standort</TH>
                {canEdit && <TH className="text-right">Aktion</TH>}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <TR key={v.id}>
                  <TD>
                    <Link href={`/fahrzeuge/${v.id}`} className="font-medium text-bone hover:text-red-300">
                      {v.model}
                    </Link>
                  </TD>
                  <TD>
                    <Plate>{v.plate}</Plate>
                  </TD>
                  <TD className="text-ash">{VEHICLE_TYPE_LABELS[v.type]}</TD>
                  <TD>{v.owner ? memberDisplayName(v.owner) : <span className="text-brass">Club</span>}</TD>
                  <TD>
                    <Badge tone={VEHICLE_STATUS_TONES[v.status]}>{VEHICLE_STATUS_LABELS[v.status]}</Badge>
                  </TD>
                  <TD className="text-ash">{v.location ?? "–"}</TD>
                  {canEdit && (
                    <TD className="text-right">
                      <QuickStatus id={v.id} status={v.status} />
                    </TD>
                  )}
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
