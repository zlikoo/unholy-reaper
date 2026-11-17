import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { AccessDenied, BackLink } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { can, SPONSOR_ROLES } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { createMemberAction } from "@/features/members/actions";
import { MemberForm } from "@/features/members/components/member-form";
import { getMemberOptions } from "@/features/members/queries";

export const metadata: Metadata = { title: "Mitglied aufnehmen" };

export default async function NewMemberPage() {
  const user = await requireUser();
  if (!can(user.role, "members.manage")) {
    return <AccessDenied message="Nur President und Vice President können Mitglieder aufnehmen." />;
  }

  return (
    <>
      <PageHeader title="Mitglied aufnehmen" back={<BackLink href="/mitglieder">Alle Mitglieder</BackLink>} />
      <Card className="max-w-3xl">
        <CardBody>
          <MemberForm
            action={createMemberAction}
            canAssignPresident={user.role === "PRESIDENT"}
            sponsors={await getMemberOptions({ roles: SPONSOR_ROLES })}
            submitLabel="Aufnehmen"
          />
        </CardBody>
      </Card>
    </>
  );
}
