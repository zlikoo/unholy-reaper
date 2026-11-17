import Link from "next/link";
import { ArrowRight, CalendarClock, Crosshair, Gavel, Motorbike, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, Plate } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { ActivityList } from "@/features/activity/components/activity-list";
import { can, visibleAudiences } from "@/features/auth/permissions";
import { requireUser, type SessionUser } from "@/features/auth/session";
import { PostCard } from "@/features/board/components/post-card";
import { weaponWhere } from "@/features/lockers/access";
import { getBalance } from "@/features/treasury/queries";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { POST_CATEGORY_LABELS, ROLE_LABELS, VEHICLE_STATUS_LABELS, VEHICLE_STATUS_TONES } from "@/lib/labels";

const author = { select: { name: true, roadName: true } } as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const greeting = `Willkommen zurück, ${user.roadName ?? user.name}.`;

  if (!can(user.role, "club.view")) return <HangaroundDashboard user={user} greeting={greeting} />;

  const now = new Date();
  const audiences = visibleAudiences(user.role);
  const canSeeLog = can(user.role, "log.view");

  const [balance, vehicleGroups, weaponGroups, memberGroups, pendingCount, posts, events, activities, myWeapons, myVehicles] =
    await Promise.all([
      getBalance(),
      db.vehicle.groupBy({ by: ["status"], _count: true }),
      db.weapon.groupBy({ by: ["status"], where: weaponWhere(user.role), _sum: { quantity: true } }),
      db.user.groupBy({ by: ["role"], where: { active: true }, _count: true }),
      db.transaction.count({ where: { status: "PENDING" } }),
      db.post.findMany({
        where: { audience: { in: audiences } },
        include: { author },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 3,
      }),
      db.post.findMany({
        where: { audience: { in: audiences }, eventAt: { gte: now } },
        orderBy: { eventAt: "asc" },
        take: 4,
      }),
      canSeeLog
        ? db.activityLog.findMany({ include: { user: author }, orderBy: { createdAt: "desc" }, take: 8 })
        : Promise.resolve([]),
      db.weapon.findMany({ where: { holderId: user.id, status: "ISSUED" }, orderBy: { issuedAt: "desc" } }),
      db.vehicle.findMany({ where: { ownerId: user.id }, orderBy: { model: "asc" } }),
    ]);

  const vehicleCount = vehicleGroups.reduce((sum, g) => sum + g._count, 0);
  const vehiclesBy = (status: string) => vehicleGroups.find((g) => g.status === status)?._count ?? 0;
  const weaponsBy = (status: string) => weaponGroups.find((g) => g.status === status)?._sum.quantity ?? 0;
  const activeMembers = memberGroups.filter((g) => g.role !== "HANGAROUND").reduce((sum, g) => sum + g._count, 0);
  const prospects = memberGroups.find((g) => g.role === "PROSPECT")?._count ?? 0;
  const hangarounds = memberGroups.find((g) => g.role === "HANGAROUND")?._count ?? 0;

  return (
    <>
      <PageHeader title="Dashboard" description={greeting} />

      {pendingCount > 0 && can(user.role, "treasury.approve") && (
        <div className="mb-5">
          <Alert tone="info">
            {pendingCount === 1 ? "Eine Auszahlung wartet" : `${pendingCount} Auszahlungen warten`} auf Freigabe.{" "}
            <Link href="/kasse" className="font-semibold underline underline-offset-4">
              Zur Kasse
            </Link>
          </Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/kasse" className="block rounded-lg focus-visible:outline-2 focus-visible:outline-blood-bright">
          <Stat
            label="Kontostand"
            value={formatMoney(balance)}
            accent
            icon={<Wallet className="size-5" />}
            sub={pendingCount > 0 ? `${pendingCount} offene Freigabe${pendingCount === 1 ? "" : "n"}` : "Clubkasse"}
            className="h-full"
          />
        </Link>
        <Link href="/fahrzeuge" className="block rounded-lg focus-visible:outline-2 focus-visible:outline-blood-bright">
          <Stat
            label="Fahrzeuge"
            value={vehicleCount}
            icon={<Motorbike className="size-5" />}
            sub={`${vehiclesBy("IN_GARAGE")} in Garage · ${vehiclesBy("ON_ROAD")} unterwegs · ${vehiclesBy("DAMAGED") + vehiclesBy("IMPOUNDED")} defekt/beschlagnahmt`}
            className="h-full"
          />
        </Link>
        <Link href="/waffenlager" className="block rounded-lg focus-visible:outline-2 focus-visible:outline-blood-bright">
          <Stat
            label="Waffenbestand"
            value={formatNumber(weaponsBy("IN_STOCK"))}
            icon={<Crosshair className="size-5" />}
            sub={`Stück im Lager · ${formatNumber(weaponsBy("ISSUED"))} ausgegeben`}
            className="h-full"
          />
        </Link>
        <Link href="/mitglieder" className="block rounded-lg focus-visible:outline-2 focus-visible:outline-blood-bright">
          <Stat
            label="Mitglieder"
            value={activeMembers}
            icon={<Users className="size-5" />}
            sub={`aktiv, davon ${prospects} Prospect${prospects === 1 ? "" : "s"}${hangarounds > 0 ? ` · dazu ${hangarounds} Hangaround${hangarounds === 1 ? "" : "s"}` : ""}`}
            className="h-full"
          />
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {canSeeLog ? (
            <Card>
              <CardHeader
                title="Letzte Aktivitäten"
                actions={
                  <Link href="/log" className="inline-flex items-center gap-1 text-xs text-ash hover:text-bone">
                    Ganzes Log <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              {activities.length === 0 ? (
                <CardBody className="text-sm text-ash">Noch keine Aktivitäten.</CardBody>
              ) : (
                <ActivityList entries={activities} showDetails={false} />
              )}
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Schwarzes Brett"
              actions={
                <Link href="/schwarzes-brett" className="inline-flex items-center gap-1 text-xs text-ash hover:text-bone">
                  Alle Aushänge <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            <CardBody className="grid gap-3 md:grid-cols-2">
              {posts.length === 0 && <p className="text-sm text-ash">Keine Aushänge.</p>}
              {posts.map((post) => (
                <PostCard key={post.id} post={post} compact />
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Nächste Termine" />
            <ul className="divide-y divide-line/60">
              {events.length === 0 && <li className="px-5 py-3 text-sm text-ash">Keine Termine eingetragen.</li>}
              {events.map((event) => (
                <li key={event.id} className="flex items-start gap-3 px-5 py-3">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-brass" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm text-bone">{event.title}</p>
                    <p className="text-xs text-ash">
                      {event.eventAt && formatDateTime(event.eventAt)} · {POST_CATEGORY_LABELS[event.category]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Meine Ausrüstung" description={ROLE_LABELS[user.role]} />
            <div className="divide-y divide-line/60">
              {myWeapons.length === 0 && myVehicles.length === 0 && (
                <p className="px-5 py-3 text-sm text-ash">Dir ist nichts ausgegeben und kein Fahrzeug zugeordnet.</p>
              )}
              {myWeapons.map((w) => (
                <Link key={w.id} href={`/waffenlager/${w.id}`} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm hover:bg-panel-2/40">
                  <span className="text-bone">
                    {w.quantity}× {w.name}
                  </span>
                  {w.serialNumber && <span className="font-mono text-xs text-ash">{w.serialNumber}</span>}
                </Link>
              ))}
              {myVehicles.map((v) => (
                <Link key={v.id} href={`/fahrzeuge/${v.id}`} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm hover:bg-panel-2/40">
                  <span className="min-w-0 truncate text-bone">{v.model}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Plate>{v.plate}</Plate>
                    <Badge tone={VEHICLE_STATUS_TONES[v.status]}>{VEHICLE_STATUS_LABELS[v.status]}</Badge>
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

async function HangaroundDashboard({ user, greeting }: { user: SessionUser; greeting: string }) {
  const posts = await db.post.findMany({
    where: { audience: { in: visibleAudiences(user.role) } },
    include: { author },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 6,
  });

  return (
    <>
      <PageHeader title="Dashboard" description={greeting} />
      <div className="mb-6">
        <Alert tone="info">
          Als Hangaround siehst du das Schwarze Brett und die Clubregeln. Club-Interna sind für Mitglieder ab Prospect.
        </Alert>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid gap-4 md:grid-cols-2 xl:col-span-2">
          {posts.length === 0 && <p className="text-sm text-ash">Keine Aushänge.</p>}
          {posts.map((post) => (
            <PostCard key={post.id} post={post} compact />
          ))}
        </div>
        <Card className="self-start">
          <CardHeader title="Regeln für Hangarounds" />
          <CardBody className="space-y-3 text-sm text-ash">
            <p>Lies dir die Clubregeln und die Regeln für Hangarounds durch. Über die Aufnahme als Prospect entscheidet die Church.</p>
            <LinkButton href="/clubregeln#HANGAROUND" variant="secondary">
              <Gavel className="size-4" /> Zu den Clubregeln
            </LinkButton>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
