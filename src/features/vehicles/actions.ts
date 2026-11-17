"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { VehicleStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { actionError, actionSuccess, noPermission, validationError, type ActionState } from "@/lib/action-state";
import { memberDisplayName, VEHICLE_STATUS_LABELS, VEHICLE_STATUSES, VEHICLE_TYPE_LABELS } from "@/lib/labels";
import { formToObject } from "@/lib/validation";
import { collectChanges, describeChanges, logActivity } from "@/features/activity/log";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { vehicleSchema, vehicleStatusSchema } from "./schemas";

async function ownerLabel(ownerId: string | null) {
  if (!ownerId) return "Club";
  const owner = await db.user.findUnique({ where: { id: ownerId }, select: { name: true, roadName: true } });
  return owner ? memberDisplayName(owner) : "Unbekannt";
}

async function validateOwner(ownerId: string | null) {
  if (!ownerId) return true;
  return Boolean(await db.user.findUnique({ where: { id: ownerId }, select: { id: true } }));
}

function revalidateVehicles(id?: string) {
  revalidatePath("/fahrzeuge");
  if (id) revalidatePath(`/fahrzeuge/${id}`);
  revalidatePath("/");
}

export async function createVehicleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "vehicles.edit")) return noPermission();

  const parsed = vehicleSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  if (!(await validateOwner(data.ownerId))) return actionError("Besitzer nicht gefunden.", { ownerId: ["Ungültig."] });
  if (await db.vehicle.findUnique({ where: { plate: data.plate } })) {
    return actionError("Dieses Kennzeichen ist schon eingetragen.", { plate: ["Bereits vorhanden."] });
  }

  const vehicle = await db.vehicle.create({ data });
  await logActivity({
    userId: user.id,
    action: "vehicle.create",
    entityType: "VEHICLE",
    entityId: vehicle.id,
    summary: `Fahrzeug ${vehicle.model} (${vehicle.plate}) eingetragen, Besitzer: ${await ownerLabel(vehicle.ownerId)}`,
  });

  revalidateVehicles();
  redirect(`/fahrzeuge/${vehicle.id}`);
}

export async function updateVehicleAction(vehicleId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "vehicles.edit")) return noPermission();

  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return actionError("Fahrzeug nicht gefunden.");

  const parsed = vehicleSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  if (!(await validateOwner(data.ownerId))) return actionError("Besitzer nicht gefunden.", { ownerId: ["Ungültig."] });
  if (data.plate !== vehicle.plate && (await db.vehicle.findUnique({ where: { plate: data.plate } }))) {
    return actionError("Dieses Kennzeichen ist schon eingetragen.", { plate: ["Bereits vorhanden."] });
  }

  await db.vehicle.update({ where: { id: vehicle.id }, data });

  const changes = collectChanges({
    Modell: [vehicle.model, data.model],
    Kennzeichen: [vehicle.plate, data.plate],
    Typ: [VEHICLE_TYPE_LABELS[vehicle.type], VEHICLE_TYPE_LABELS[data.type]],
    Besitzer: [await ownerLabel(vehicle.ownerId), await ownerLabel(data.ownerId)],
    Status: [VEHICLE_STATUS_LABELS[vehicle.status], VEHICLE_STATUS_LABELS[data.status]],
    Standort: [vehicle.location, data.location],
    Notizen: [vehicle.notes, data.notes],
    Foto: [vehicle.imageUrl, data.imageUrl],
  });
  if (Object.keys(changes).length > 0) {
    await logActivity({
      userId: user.id,
      action: "vehicle.update",
      entityType: "VEHICLE",
      entityId: vehicle.id,
      summary: `Fahrzeug ${data.model} (${data.plate}) bearbeitet: ${describeChanges(changes)}`,
      changes,
    });
  }

  revalidateVehicles(vehicle.id);
  return actionSuccess("Fahrzeug gespeichert.");
}

/** Status ändern (ein-/auslagern), optional mit neuem Standort. */
export async function changeVehicleStatusAction(
  vehicleId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "vehicles.edit")) return noPermission();

  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return actionError("Fahrzeug nicht gefunden.");

  const parsed = vehicleStatusSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const status: VehicleStatus = parsed.data.status;
  const location = parsed.data.location ?? vehicle.location;

  if (status === vehicle.status && location === vehicle.location) return actionSuccess("Keine Änderung.");

  await db.vehicle.update({ where: { id: vehicle.id }, data: { status, location } });

  const changes = collectChanges({
    Status: [VEHICLE_STATUS_LABELS[vehicle.status], VEHICLE_STATUS_LABELS[status]],
    Standort: [vehicle.location, location],
  });
  const verb =
    status === "IN_GARAGE" && vehicle.status !== "IN_GARAGE"
      ? "eingelagert"
      : status === "ON_ROAD" && vehicle.status === "IN_GARAGE"
        ? "ausgelagert"
        : "geändert";
  await logActivity({
    userId: user.id,
    action: "vehicle.status",
    entityType: "VEHICLE",
    entityId: vehicle.id,
    summary: `Fahrzeug ${vehicle.model} (${vehicle.plate}) ${verb}: ${describeChanges(changes)}`,
    changes,
  });

  revalidateVehicles(vehicle.id);
  return actionSuccess(`Status: ${VEHICLE_STATUS_LABELS[status]}.`);
}

/** Schnellaktion aus der Liste: Status direkt setzen. */
export async function quickVehicleStatusAction(vehicleId: string, status: string): Promise<ActionState> {
  if (!(VEHICLE_STATUSES as string[]).includes(status)) return actionError("Ungültiger Status.");
  const formData = new FormData();
  formData.set("status", status);
  return changeVehicleStatusAction(vehicleId, { status: "idle" }, formData);
}

export async function deleteVehicleAction(vehicleId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "vehicles.delete")) return noPermission();

  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return actionError("Fahrzeug nicht gefunden.");

  await db.vehicle.delete({ where: { id: vehicle.id } });
  await logActivity({
    userId: user.id,
    action: "vehicle.delete",
    entityType: "VEHICLE",
    entityId: vehicle.id,
    summary: `Fahrzeug ${vehicle.model} (${vehicle.plate}) gelöscht`,
  });

  revalidateVehicles();
  redirect("/fahrzeuge");
}
