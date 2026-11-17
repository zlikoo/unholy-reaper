import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { AccessDenied, Alert, BackLink } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { getLockerOptions } from "@/features/lockers/access";
import { createWeaponAction } from "@/features/weapons/actions";
import { WeaponCreateForm } from "@/features/weapons/components/weapon-forms";

export const metadata: Metadata = { title: "Einlagern" };

export default async function NewWeaponPage() {
  const user = await requireUser();
  if (!can(user.role, "weapons.edit")) return <AccessDenied message="Prospects können das Waffenlager nur ansehen." />;
  const lockers = await getLockerOptions(user.role);

  return (
    <>
      <PageHeader title="Einlagern" back={<BackLink href="/waffenlager">Zum Waffenlager</BackLink>} />
      <Card className="max-w-3xl">
        <CardBody className="space-y-4">
          {lockers.length === 0 && (
            <Alert tone="info">Für deinen Rang ist kein Schließfach freigegeben. Der Posten wird ohne Fach gespeichert.</Alert>
          )}
          <WeaponCreateForm action={createWeaponAction} lockers={lockers} />
        </CardBody>
      </Card>
    </>
  );
}
