import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { AccessDenied, BackLink } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { createLockerAction } from "@/features/lockers/actions";
import { LockerForm } from "@/features/lockers/components/locker-form";

export const metadata: Metadata = { title: "Schließfach anlegen" };

export default async function NewLockerPage() {
  const user = await requireUser();
  if (!can(user.role, "lockers.manage")) {
    return <AccessDenied message="Schließfächer verwalten President, Vice President und Sergeant at Arms." />;
  }
  return (
    <>
      <PageHeader title="Schließfach anlegen" back={<BackLink href="/schliessfaecher">Alle Schließfächer</BackLink>} />
      <Card className="max-w-3xl">
        <CardBody>
          <LockerForm action={createLockerAction} currentRole={user.role} submitLabel="Anlegen" />
        </CardBody>
      </Card>
    </>
  );
}
