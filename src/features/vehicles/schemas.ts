import { z } from "zod";
import { VEHICLE_STATUSES, VEHICLE_TYPES } from "@/lib/labels";
import { enumField, optionalId, optionalText, optionalUrl, requiredText } from "@/lib/validation";

const types = VEHICLE_TYPES as [(typeof VEHICLE_TYPES)[number], ...(typeof VEHICLE_TYPES)[number][]];
const statuses = VEHICLE_STATUSES as [(typeof VEHICLE_STATUSES)[number], ...(typeof VEHICLE_STATUSES)[number][]];

export const vehicleStatusField = enumField(statuses, "einen Status");

export const vehicleSchema = z.object({
  model: requiredText("Modell", 80),
  plate: requiredText("Kennzeichen", 20).transform((value) => value.toUpperCase().replace(/\s+/g, " ")),
  type: enumField(types, "einen Typ"),
  ownerId: optionalId,
  status: vehicleStatusField,
  location: optionalText("Standort", 120),
  notes: optionalText("Notizen", 2000),
  imageUrl: optionalUrl,
});

export const vehicleStatusSchema = z.object({
  status: vehicleStatusField,
  location: optionalText("Standort", 120),
});
