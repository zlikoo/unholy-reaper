import { z } from "zod";
import { dateTimeField, optionalId, optionalText, positiveInt, requiredText } from "@/lib/validation";

const MAX_QUANTITY = 100_000;

export const weaponCreateSchema = z.object({
  name: requiredText("Waffe", 80),
  serialNumber: optionalText("Seriennummer", 40),
  quantity: positiveInt("Menge", MAX_QUANTITY),
  lockerId: optionalId,
  date: dateTimeField("Datum"),
  notes: optionalText("Notizen", 1000),
});

export const weaponUpdateSchema = z.object({
  name: requiredText("Waffe", 80),
  serialNumber: optionalText("Seriennummer", 40),
  quantity: positiveInt("Menge", MAX_QUANTITY),
  lockerId: optionalId,
  notes: optionalText("Notizen", 1000),
});

const movementBase = {
  quantity: positiveInt("Menge", MAX_QUANTITY),
  date: dateTimeField("Datum"),
  note: optionalText("Notiz", 300),
};

export const issueSchema = z.object({
  ...movementBase,
  memberId: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string().min(1, "Bitte ein Mitglied auswählen.")),
});

export const returnSchema = z.object({ ...movementBase, lockerId: optionalId });

export const lostSchema = z.object(movementBase);
