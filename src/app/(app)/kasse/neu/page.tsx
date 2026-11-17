import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { AccessDenied, BackLink } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { getMemberOptions } from "@/features/members/queries";
import { createTransactionAction } from "@/features/treasury/actions";
import { TransactionForm } from "@/features/treasury/components/transaction-form";
import { getApprovalThreshold } from "@/features/treasury/settings";

export const metadata: Metadata = { title: "Neue Buchung" };

export default async function NewTransactionPage() {
  const user = await requireUser();
  if (!can(user.role, "treasury.edit")) {
    return <AccessDenied message="Nur Secretary/Treasurer, Vice President und President dürfen buchen." />;
  }

  const [members, threshold] = await Promise.all([getMemberOptions(), getApprovalThreshold()]);
  return (
    <>
      <PageHeader title="Neue Buchung" back={<BackLink href="/kasse">Zur Kasse</BackLink>} />
      <Card className="max-w-3xl">
        <CardBody>
          <TransactionForm action={createTransactionAction} members={members} threshold={threshold} />
        </CardBody>
      </Card>
    </>
  );
}
