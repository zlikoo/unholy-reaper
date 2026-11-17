import { z } from "zod";
import { TRANSACTION_CATEGORIES } from "@/lib/labels";
import { dateTimeField, enumField, optionalId, positiveInt, requiredText } from "@/lib/validation";

const categories = TRANSACTION_CATEGORIES as [(typeof TRANSACTION_CATEGORIES)[number], ...(typeof TRANSACTION_CATEGORIES)[number][]];

export const transactionSchema = z.object({
  type: enumField(["DEPOSIT", "WITHDRAWAL"] as const, "Einzahlung oder Auszahlung"),
  amount: positiveInt("Betrag", 100_000_000),
  category: enumField(categories, "eine Kategorie"),
  description: requiredText("Beschreibung", 200),
  memberId: optionalId,
  date: dateTimeField("Datum"),
});

export const thresholdSchema = z.object({
  threshold: z.preprocess(
    (value) => {
      const raw = typeof value === "string" ? value.replace(/[\s.$]/g, "") : "";
      return raw === "" ? undefined : Number(raw);
    },
    z
      .number({ error: "Bitte einen Betrag angeben." })
      .int("Bitte einen ganzen Betrag angeben.")
      .min(0, "Der Betrag darf nicht negativ sein.")
      .max(100_000_000, "Der Betrag ist zu groß."),
  ),
});
