import type { Metadata } from "next";
import Link from "next/link";
import { Archive, Crosshair, HandMetal, PackagePlus, TriangleAlert } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FilterForm, FilterSelect, SearchInput } from "@/components/ui/filter-form";
import { AccessDenied, EmptyState } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Table, TD, TH, TR } from "@/components/ui/table";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { getLockerOptions, weaponWhere } from "@/features/lockers/access";
import { db } from "@/lib/db";
import { textContains } from "@/lib/search";
import { formatDate, formatNumber } from "@/lib/format";
import { memberDisplayName, WEAPON_STATUS_LABELS, WEAPON_STATUS_TONES, WEAPON_STATUSES } from "@/lib/labels";
import { getParam, pickEnum } from "@/lib/search-params";

export const metadata: Metadata = { title: "Waffenlager" };

export default async function WeaponsPage({ searchParams }: PageProps<"/waffenlager">) {
  const user = await requireUser();
  if (!can(user.role, "club.view")) return <AccessDenied />;

  const params = await searchParams;
  const q = getParam(params, "q");
  const status = pickEnum(getParam(params, "status"), WEAPON_STATUSES);
  const lockers = await getLockerOptions(user.role);
  const lockerFilter = pickEnum(getParam(params, "fach"), lockers.map((l) => l.id));

  const visible = weaponWhere(user.role);
  const filter: Prisma.WeaponWhereInput = {
    ...(status ? { status } : {}),
    ...(lockerFilter ? { lockerId: lockerFilter } : {}),
    ...(q
      ? {
          OR: [
            { name: textContains(q) },
            { serialNumber: textContains(q) },
            { holder: { is: { OR: [{ name: textContains(q) }, { roadName: textContains(q) }] } } },
          ],
        }
      : {}),
  };

  const include = {
    holder: { select: { id: true, name: true, roadName: true } },
    locker: { select: { id: true, name: true, number: true } },
  } as const;
  const orderBy = [{ name: "asc" as const }, { serialNumber: "asc" as const }];
  const hasFilter = Boolean(q || status || lockerFilter);
  // Ohne Filter reicht eine Abfrage für Übersicht und Liste.
  const [all, filtered] = await Promise.all([
    db.weapon.findMany({ where: visible, include, orderBy }),
    hasFilter ? db.weapon.findMany({ where: { AND: [visible, filter] }, include, orderBy }) : Promise.resolve(null),
  ]);
  const rows = filtered ?? all;

  const totals = { IN_STOCK: 0, ISSUED: 0, LOST: 0 };
  const byName = new Map<string, { IN_STOCK: number; ISSUED: number; LOST: number }>();
  const byHolder = new Map<string, { holder: { id: string; name: string; roadName: string | null }; items: typeof all }>();
  for (const w of all) {
    totals[w.status] += w.quantity;
    const entry = byName.get(w.name) ?? { IN_STOCK: 0, ISSUED: 0, LOST: 0 };
    entry[w.status] += w.quantity;
    byName.set(w.name, entry);
    if (w.status === "ISSUED" && w.holder) {
      const group = byHolder.get(w.holder.id) ?? { holder: w.holder, items: [] };
      group.items.push(w);
      byHolder.set(w.holder.id, group);
    }
  }
  const stock = [...byName.entries()].sort((a, b) => a[0].localeCompare(b[0], "de"));
  const holders = [...byHolder.values()].sort((a, b) => a.holder.name.localeCompare(b.holder.name, "de"));

  return (
    <>
      <PageHeader
        title="Waffenlager"
        description="Bestand in den Schließfächern, Ausgaben und Rückgaben. Posten in Fächern ohne Freigabe für deinen Rang sind ausgeblendet."
        actions={
          can(user.role, "weapons.edit") && (
            <LinkButton href="/waffenlager/neu">
              <PackagePlus className="size-4" /> Einlagern
            </LinkButton>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Im Lager" value={formatNumber(totals.IN_STOCK)} icon={<Archive className="size-5" />} sub="Stück in sichtbaren Fächern" accent />
        <Stat label="Ausgegeben" value={formatNumber(totals.ISSUED)} icon={<HandMetal className="size-5" />} sub={`an ${holders.length} Mitglieder`} />
        <Stat label="Verloren" value={formatNumber(totals.LOST)} icon={<TriangleAlert className="size-5" />} />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Lagerbestand" description="Summen pro Waffe" />
          {stock.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ash">Noch nichts eingelagert.</p>
          ) : (
            <Table className="min-w-0">
              <thead>
                <tr>
                  <TH>Waffe</TH>
                  <TH className="text-right">Im Lager</TH>
                  <TH className="text-right">Ausgegeben</TH>
                  <TH className="text-right">Verloren</TH>
                </tr>
              </thead>
              <tbody>
                {stock.map(([name, s]) => (
                  <TR key={name}>
                    <TD>
                      <Link href={`/waffenlager?q=${encodeURIComponent(name)}`} className="text-bone hover:text-red-300">
                        {name}
                      </Link>
                    </TD>
                    <TD className="text-right font-display text-base text-bone">{s.IN_STOCK || "–"}</TD>
                    <TD className="text-right text-ash">{s.ISSUED || "–"}</TD>
                    <TD className="text-right text-ash">{s.LOST || "–"}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Wer hat was" description="Aktuell ausgegebene Posten" />
          {holders.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ash">Nichts ausgegeben.</p>
          ) : (
            <ul className="divide-y divide-line/60">
              {holders.map(({ holder, items }) => (
                <li key={holder.id} className="px-5 py-3">
                  <Link href={`/mitglieder/${holder.id}`} className="text-sm font-medium text-bone hover:text-red-300">
                    {memberDisplayName(holder)}
                  </Link>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {items.map((w) => (
                      <li key={w.id}>
                        <Link
                          href={`/waffenlager/${w.id}`}
                          className="inline-block rounded border border-line bg-ink/60 px-2 py-0.5 text-xs text-ash hover:border-brass/50 hover:text-bone"
                        >
                          {w.quantity}× {w.name}
                          {w.serialNumber && ` · ${w.serialNumber}`}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Alle Posten" description={`${rows.length} Posten${q || status || lockerFilter ? " (gefiltert)" : ""}`} />
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <FilterForm action="/waffenlager">
            <SearchInput defaultValue={q} placeholder="Waffe, Seriennummer oder Mitglied" />
            <FilterSelect name="status" label="Status" defaultValue={status} options={WEAPON_STATUSES.map((s) => ({ value: s, label: WEAPON_STATUS_LABELS[s] }))} />
            <FilterSelect name="fach" label="Fach" defaultValue={lockerFilter} options={lockers.map((l) => ({ value: l.id, label: l.label }))} />
          </FilterForm>
        </div>

        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Keine Posten gefunden" icon={<Crosshair className="size-8" />} />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line/60 md:hidden">
              {rows.map((w) => (
                <li key={w.id}>
                  <Link href={`/waffenlager/${w.id}`} className="block space-y-1 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm text-bone">
                        {w.quantity}× {w.name}
                      </span>
                      <Badge tone={WEAPON_STATUS_TONES[w.status]}>{WEAPON_STATUS_LABELS[w.status]}</Badge>
                    </div>
                    <p className="text-xs text-ash">
                      {w.serialNumber ? `SN ${w.serialNumber}` : "ohne Seriennummer"}
                      {w.locker && ` · ${w.locker.name}`}
                      {w.holder && ` · ${w.status === "LOST" ? "zuletzt bei" : "bei"} ${memberDisplayName(w.holder)}`}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <TH>Waffe</TH>
                    <TH>Seriennummer</TH>
                    <TH className="text-right">Menge</TH>
                    <TH>Status</TH>
                    <TH>Fach / ausgegeben an</TH>
                    <TH>Seit</TH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((w) => (
                    <TR key={w.id}>
                      <TD>
                        <Link href={`/waffenlager/${w.id}`} className="font-medium text-bone hover:text-red-300">
                          {w.name}
                        </Link>
                      </TD>
                      <TD className="font-mono text-xs text-ash">{w.serialNumber ?? "–"}</TD>
                      <TD className="text-right font-display text-base">{w.quantity}</TD>
                      <TD>
                        <Badge tone={WEAPON_STATUS_TONES[w.status]}>{WEAPON_STATUS_LABELS[w.status]}</Badge>
                      </TD>
                      <TD className="text-ash">
                        {w.status === "IN_STOCK" && (w.locker ? `${w.locker.number ? `Fach ${w.locker.number} · ` : ""}${w.locker.name}` : "ohne Fach")}
                        {w.status !== "IN_STOCK" && w.holder && (
                          <Link href={`/mitglieder/${w.holder.id}`} className="hover:text-bone">
                            {w.status === "LOST" && "zuletzt bei "}
                            {memberDisplayName(w.holder)}
                          </Link>
                        )}
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-ash">
                        {w.status === "ISSUED" && w.issuedAt ? formatDate(w.issuedAt) : formatDate(w.updatedAt)}
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
