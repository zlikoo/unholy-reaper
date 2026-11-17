import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { AccessDenied, BackLink } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { getMemberOptions } from "@/features/members/queries";
import { createVehicleAction } from "@/features/vehicles/actions";
import { VehicleForm } from "@/features/vehicles/components/vehicle-form";

export const metadata: Metadata = { title: "Fahrzeug eintragen" };

export default async function NewVehiclePage() {
  const user = await requireUser();
  if (!can(user.role, "vehicles.edit")) return <AccessDenied message="Prospects können Fahrzeuge nur ansehen." />;

  return (
    <>
      <PageHeader title="Fahrzeug eintragen" back={<BackLink href="/fahrzeuge">Alle Fahrzeuge</BackLink>} />
      <Card className="max-w-3xl">
        <CardBody>
          <VehicleForm action={createVehicleAction} members={await getMemberOptions()} submitLabel="Eintragen" />
        </CardBody>
      </Card>
    </>
  );
}
