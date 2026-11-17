import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight, Check, Hourglass, Plus, Trash2, Wallet, X } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FilterForm, FilterSelect, SearchInput } from "@/components/ui/filter-form";
import { ActionButton, ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { AccessDenied, Alert, EmptyState } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Pagination, Table, TD, TH, TR } from "@/components/ui/table";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import {
  approveTransactionAction,
  deleteTransactionAction,
  rejectTransactionAction,
  updateThresholdAction,
} from "@/features/treasury/actions";
import { TreasuryChart } from "@/features/treasury/components/treasury-chart";
import { getBalance, getDailySeries } from "@/features/treasury/queries";
import { getApprovalThreshold } from "@/features/treasury/settings";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  memberDisplayName,
  TRANSACTION_CATEGORIES,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_STATUS_TONES,
} from "@/lib/labels";
import { getPage, getParam, pickEnum } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Kasse" };

const PAGE_SIZE = 25;
const TYPE_FILTER = { ein: "DEPOSIT", aus: "WITHDRAWAL" } as const;
const STATUS_FILTER = { gebucht: "APPROVED", offen: "PENDING", abgelehnt: "REJECTED" } as const;

const person = { select: { id: true, name: true, roadName: true } } as const;

export default async function TreasuryPage({ searchParams }: PageProps<"/kasse">) {
  const user = await requireUser();
  if (!can(user.role, "club.view")) return <AccessDenied />;

  const params = await searchParams;
  const q = getParam(params, "q");
  const typeKey = pickEnum(getParam(params, "art"), ["ein", "aus"] as const);
  const statusKey = pickEnum(getParam(params, "status"), ["gebucht", "offen", "abgelehnt"] as const);
  const category = pickEnum(getParam(params, "kategorie"), TRANSACTION_CATEGORIES);
  const page = getPage(params);

  const where: Prisma.TransactionWhereInput = {
    ...(typeKey ? { type: TYPE_FILTER[typeKey] } : {}),
    ...(statusKey ? { status: STATUS_FILTER[statusKey] } : {}),
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { description: { contains: q } },
            { member: { is: { OR: [{ name: { contains: q } }, { roadName: { contains: q } }] } } },
          ],
        }
      : {}),
  };

  const [balance, series, threshold, pending, total, transactions] = await Promise.all([
    getBalance(),
    getDailySeries(30),
    getApprovalThreshold(),
    db.transaction.findMany({
      where: { status: "PENDING" },
      include: { createdBy: person, member: person },
      orderBy: { createdAt: "asc" },
    }),
    db.transaction.count({ where }),
    db.transaction.findMany({
      where,
      include: { createdBy: person, member: person, reviewedBy: person },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const income30 = series.reduce((sum, d) => sum + d.deposits, 0);
  const expenses30 = series.reduce((sum, d) => sum + d.withdrawals, 0);
  const pendingSum = pending.reduce((sum, t) => sum + t.amount, 0);
  const canEdit = can(user.role, "treasury.edit");
  const canApprove = can(user.role, "treasury.approve");
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Kasse"
        description="Clubkasse mit allen Ein- und Auszahlungen."
        actions={
          canEdit && (
            <LinkButton href="/kasse/neu">
              <Plus className="size-4" /> Neue Buchung
            </LinkButton>
          )
        }
      />

      {getParam(params, "hinweis") === "freigabe" && (
        <div className="mb-4">
          <Alert tone="info">
            Die Auszahlung liegt über der Freigabegrenze von {formatMoney(threshold)} und wartet auf Freigabe durch
            Secretary/Treasurer oder President.
          </Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Kontostand" value={formatMoney(balance)} accent icon={<Wallet className="size-5" />} sub="Nur gebuchte Beträge" />
        <Stat label="Einnahmen 30 Tage" value={formatMoney(income30)} icon={<ArrowUpRight className="size-5" />} />
        <Stat label="Ausgaben 30 Tage" value={formatMoney(expenses30)} icon={<ArrowDownRight className="size-5" />} />
        <Stat
          label="Offene Freigaben"
          value={pending.length}
          icon={<Hourglass className="size-5" />}
          sub={pending.length > 0 ? `Summe ${formatMoney(pendingSum)}` : `Grenze: über ${formatMoney(threshold)}`}
        />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Letzte 30 Tage" />
          <CardBody>
            <TreasuryChart data={series} />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Offene Freigaben"
              description={`Auszahlungen über ${formatMoney(threshold)} gibt Secretary/Treasurer oder President frei.`}
            />
            {pending.length === 0 ? (
              <CardBody className="text-sm text-ash">Keine offenen Auszahlungen.</CardBody>
            ) : (
              <ul className="divide-y divide-line/60">
                {pending.map((t) => {
                  const ownRequest = t.createdById === user.id;
                  return (
                    <li key={t.id} className="space-y-2 px-5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-bone">{t.description}</p>
                          <p className="text-xs text-ash">
                            {TRANSACTION_CATEGORY_LABELS[t.category]} · angelegt von{" "}
                            {t.createdBy ? memberDisplayName(t.createdBy) : "unbekannt"} · {formatDateTime(t.createdAt)}
                          </p>
                        </div>
                        <span className="whitespace-nowrap font-display text-base text-red-300">− {formatMoney(t.amount)}</span>
                      </div>
                      {canApprove && (
                        <div className="flex flex-wrap gap-2">
                          {ownRequest ? (
                            <span className="text-xs text-ash">Eigene Anfrage, braucht eine zweite Person.</span>
                          ) : (
                            <ActionButton
                              action={approveTransactionAction.bind(null, t.id)}
                              confirmMessage={`Auszahlung über ${formatMoney(t.amount)} freigeben?`}
                              variant="primary"
                            >
                              <Check className="size-3.5" /> Freigeben
                            </ActionButton>
                          )}
                          <ActionButton
                            action={rejectTransactionAction.bind(null, t.id)}
                            confirmMessage="Auszahlung ablehnen?"
                            variant="danger"
                          >
                            <X className="size-3.5" /> Ablehnen
                          </ActionButton>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {can(user.role, "treasury.settings") && (
            <Card>
              <CardHeader title="Freigabegrenze" description="Auszahlungen über diesem Betrag brauchen eine Freigabe." />
              <CardBody>
                <ActionForm action={updateThresholdAction} className="flex flex-wrap items-start gap-3">
                  <Field name="threshold" label="Betrag in $" className="min-w-36 flex-1">
                    <Input name="threshold" inputMode="numeric" defaultValue={threshold} required />
                  </Field>
                  <SubmitButton variant="secondary" className="sm:mt-5">
                    Speichern
                  </SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader title="Verlauf" description={`${total} Buchung${total === 1 ? "" : "en"}${q || typeKey || statusKey || category ? " (gefiltert)" : ""}`} />
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <FilterForm action="/kasse">
            <SearchInput defaultValue={q} placeholder="Beschreibung oder Mitglied" />
            <FilterSelect
              name="art"
              label="Art"
              defaultValue={typeKey}
              options={[
                { value: "ein", label: "Einzahlungen" },
                { value: "aus", label: "Auszahlungen" },
              ]}
            />
            <FilterSelect
              name="kategorie"
              label="Kategorie"
              defaultValue={category}
              options={TRANSACTION_CATEGORIES.map((c) => ({ value: c, label: TRANSACTION_CATEGORY_LABELS[c] }))}
            />
            <FilterSelect
              name="status"
              label="Status"
              defaultValue={statusKey}
              options={[
                { value: "gebucht", label: "Gebucht" },
                { value: "offen", label: "Wartet auf Freigabe" },
                { value: "abgelehnt", label: "Abgelehnt" },
              ]}
            />
          </FilterForm>
        </div>

        {transactions.length === 0 ? (
          <CardBody>
            <EmptyState title="Keine Buchungen gefunden" />
          </CardBody>
        ) : (
          <>
            {/* Handy */}
            <ul className="divide-y divide-line/60 md:hidden">
              {transactions.map((t) => (
                <li key={t.id} className={cn("space-y-1 px-4 py-3", t.status === "REJECTED" && "opacity-60")}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm text-bone">{t.description}</p>
                    <Amount type={t.type} amount={t.amount} status={t.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ash">
                    <span>{formatDateTime(t.date)}</span>
                    <Badge>{TRANSACTION_CATEGORY_LABELS[t.category]}</Badge>
                    {t.status !== "APPROVED" && <Badge tone={TRANSACTION_STATUS_TONES[t.status]}>{TRANSACTION_STATUS_LABELS[t.status]}</Badge>}
                    {t.member && <span>· {memberDisplayName(t.member)}</span>}
                  </div>
                  {canEdit && (
                    <ActionButton
                      action={deleteTransactionAction.bind(null, t.id)}
                      confirmMessage={`Buchung „${t.description}“ über ${formatMoney(t.amount)} löschen?`}
                      variant="ghost"
                      className="-ml-3"
                    >
                      <Trash2 className="size-3.5" /> Löschen
                    </ActionButton>
                  )}
                </li>
              ))}
            </ul>

            {/* Desktop */}
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <TH>Datum</TH>
                    <TH>Beschreibung</TH>
                    <TH>Kategorie</TH>
                    <TH>Mitglied</TH>
                    <TH>Gebucht von</TH>
                    <TH className="text-right">Betrag</TH>
                    {canEdit && <TH className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <TR key={t.id} className={t.status === "REJECTED" ? "opacity-60" : undefined}>
                      <TD className="whitespace-nowrap text-ash">{formatDateTime(t.date)}</TD>
                      <TD>
                        <span className="text-bone">{t.description}</span>
                        {t.status !== "APPROVED" && (
                          <div className="mt-1">
                            <Badge tone={TRANSACTION_STATUS_TONES[t.status]}>{TRANSACTION_STATUS_LABELS[t.status]}</Badge>
                          </div>
                        )}
                      </TD>
                      <TD>
                        <Badge>{TRANSACTION_CATEGORY_LABELS[t.category]}</Badge>
                      </TD>
                      <TD className="text-ash">{t.member ? memberDisplayName(t.member) : "–"}</TD>
                      <TD className="text-xs text-ash">
                        {t.createdBy ? (t.createdBy.roadName ?? t.createdBy.name) : "–"}
                        {t.reviewedBy && (
                          <div>
                            {t.status === "REJECTED" ? "abgelehnt" : "freigegeben"} von {t.reviewedBy.roadName ?? t.reviewedBy.name}
                          </div>
                        )}
                      </TD>
                      <TD className="text-right">
                        <Amount type={t.type} amount={t.amount} status={t.status} />
                      </TD>
                      {canEdit && (
                        <TD>
                          <ActionButton
                            action={deleteTransactionAction.bind(null, t.id)}
                            confirmMessage={`Buchung „${t.description}“ über ${formatMoney(t.amount)} löschen?`}
                            variant="ghost"
                            title="Löschen"
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Löschen</span>
                          </ActionButton>
                        </TD>
                      )}
                    </TR>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination
              basePath="/kasse"
              params={{ q, art: typeKey ?? "", kategorie: category ?? "", status: statusKey ?? "" }}
              page={page}
              totalPages={totalPages}
            />
          </>
        )}
      </Card>
    </>
  );
}

function Amount({ type, amount, status }: { type: "DEPOSIT" | "WITHDRAWAL"; amount: number; status: string }) {
  const deposit = type === "DEPOSIT";
  return (
    <span
      className={cn(
        "whitespace-nowrap font-display text-base tracking-wide",
        deposit ? "text-sky-300" : "text-red-300",
        status === "PENDING" && "opacity-70",
        status === "REJECTED" && "line-through decoration-1 opacity-70",
      )}
    >
      {deposit ? "+" : "−"} {formatMoney(amount)}
    </span>
  );
}
