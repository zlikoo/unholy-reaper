import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/form";
import { BackLink, DetailItem, Plate } from "@/components/ui/misc";
import { AccessDenied } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { getMemberOptions } from "@/features/members/queries";
import { changeVehicleStatusAction, deleteVehicleAction, updateVehicleAction } from "@/features/vehicles/actions";
import { VehicleForm, VehicleStatusForm } from "@/features/vehicles/components/vehicle-form";
import { VehicleImage } from "@/features/vehicles/components/vehicle-image";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { memberDisplayName, VEHICLE_STATUS_LABELS, VEHICLE_STATUS_TONES, VEHICLE_TYPE_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Fahrzeug" };

export default async function VehiclePage({ params }: PageProps<"/fahrzeuge/[id]">) {
  const user = await requireUser();
  if (!can(user.role, "club.view")) return <AccessDenied />;
  const { id } = await params;
  const vehicle = await db.vehicle.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, roadName: true } } },
  });
  if (!vehicle) notFound();

  const canEdit = can(user.role, "vehicles.edit");
  const canDelete = can(user.role, "vehicles.delete");

  return (
    <>
      <PageHeader
        title={vehicle.model}
        back={<BackLink href="/fahrzeuge">Alle Fahrzeuge</BackLink>}
        actions={
          <>
            <Plate>{vehicle.plate}</Plate>
            <Badge tone={VEHICLE_STATUS_TONES[vehicle.status]}>{VEHICLE_STATUS_LABELS[vehicle.status]}</Badge>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-2">
          <Card className="overflow-hidden">
            <VehicleImage src={vehicle.imageUrl} type={vehicle.type} alt={vehicle.model} className="aspect-video w-full" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-4">
                <DetailItem label="Typ">{VEHICLE_TYPE_LABELS[vehicle.type]}</DetailItem>
                <DetailItem label="Besitzer">
                  {vehicle.owner ? (
                    <Link href={`/mitglieder/${vehicle.owner.id}`} className="hover:text-red-300">
                      {memberDisplayName(vehicle.owner)}
                    </Link>
                  ) : (
                    <span className="text-brass">Club</span>
                  )}
                </DetailItem>
                <DetailItem label="Standort">{vehicle.location ?? "–"}</DetailItem>
                <DetailItem label="Zuletzt geändert">{formatDateTime(vehicle.updatedAt)}</DetailItem>
                <DetailItem label="Notizen" className="col-span-2">
                  <span className="whitespace-pre-line">{vehicle.notes ?? "–"}</span>
                </DetailItem>
              </dl>
            </CardBody>
          </Card>

          {canEdit && (
            <Card>
              <CardHeader title="Ein- / Auslagern" description="Status und Standort schnell ändern." />
              <CardBody>
                <VehicleStatusForm action={changeVehicleStatusAction.bind(null, vehicle.id)} status={vehicle.status} />
              </CardBody>
            </Card>
          )}
        </div>

        {canEdit && (
          <div className="space-y-6 xl:col-span-3">
            <Card>
              <CardHeader
                title="Bearbeiten"
                actions={
                  canDelete && (
                    <ActionButton
                      action={deleteVehicleAction.bind(null, vehicle.id)}
                      confirmMessage={`${vehicle.model} (${vehicle.plate}) wirklich löschen?`}
                      variant="danger"
                    >
                      <Trash2 className="size-3.5" /> Löschen
                    </ActionButton>
                  )
                }
              />
              <CardBody>
                <VehicleForm
                  action={updateVehicleAction.bind(null, vehicle.id)}
                  vehicle={vehicle}
                  members={await getMemberOptions({ include: [vehicle.ownerId] })}
                  submitLabel="Speichern"
                />
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
