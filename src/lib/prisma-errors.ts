/** true, wenn Prisma eine Verletzung einer Unique-Bedingung meldet (z. B. doppeltes Kennzeichen). */
export function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}
