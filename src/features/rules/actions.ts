"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionError, actionSuccess, noPermission, validationError, type ActionState } from "@/lib/action-state";
import { RULE_SECTION_LABELS, RULE_SECTIONS } from "@/lib/labels";
import { enumField, formToObject, requiredText } from "@/lib/validation";
import { logActivity } from "@/features/activity/log";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";

const sections = RULE_SECTIONS as [(typeof RULE_SECTIONS)[number], ...(typeof RULE_SECTIONS)[number][]];

const ruleSchema = z.object({
  section: enumField(sections, "einen Bereich"),
  title: requiredText("Überschrift", 120),
  content: requiredText("Text", 5000),
});

export async function createRuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "rules.manage")) return noPermission();
  const parsed = ruleSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  const last = await db.clubRule.findFirst({ where: { section: data.section }, orderBy: { sortOrder: "desc" } });
  const rule = await db.clubRule.create({ data: { ...data, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  await logActivity({
    userId: user.id,
    action: "rules.create",
    entityType: "RULES",
    entityId: rule.id,
    summary: `${RULE_SECTION_LABELS[rule.section]}: Eintrag „${rule.title}“ hinzugefügt`,
  });

  revalidatePath("/clubregeln");
  redirect(`/clubregeln#${rule.section}`);
}

export async function updateRuleAction(ruleId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "rules.manage")) return noPermission();
  const rule = await db.clubRule.findUnique({ where: { id: ruleId } });
  if (!rule) return actionError("Eintrag nicht gefunden.");
  const parsed = ruleSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  const sectionChanged = data.section !== rule.section;
  const last = sectionChanged ? await db.clubRule.findFirst({ where: { section: data.section }, orderBy: { sortOrder: "desc" } }) : null;
  await db.clubRule.update({
    where: { id: rule.id },
    data: { ...data, ...(sectionChanged ? { sortOrder: (last?.sortOrder ?? -1) + 1 } : {}) },
  });
  await logActivity({
    userId: user.id,
    action: "rules.update",
    entityType: "RULES",
    entityId: rule.id,
    summary: `${RULE_SECTION_LABELS[data.section]}: Eintrag „${data.title}“ geändert`,
    changes:
      rule.content !== data.content || rule.title !== data.title
        ? { Text: [rule.title, data.title === rule.title ? `${data.title} (Text geändert)` : data.title] }
        : null,
  });

  revalidatePath("/clubregeln");
  redirect(`/clubregeln#${data.section}`);
}

export async function deleteRuleAction(ruleId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "rules.manage")) return noPermission();
  const rule = await db.clubRule.findUnique({ where: { id: ruleId } });
  if (!rule) return actionError("Eintrag nicht gefunden.");

  await db.clubRule.delete({ where: { id: rule.id } });
  await logActivity({
    userId: user.id,
    action: "rules.delete",
    entityType: "RULES",
    entityId: rule.id,
    summary: `${RULE_SECTION_LABELS[rule.section]}: Eintrag „${rule.title}“ gelöscht`,
  });

  revalidatePath("/clubregeln");
  redirect(`/clubregeln#${rule.section}`);
}

export async function moveRuleAction(ruleId: string, direction: "up" | "down"): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "rules.manage")) return noPermission();
  const rule = await db.clubRule.findUnique({ where: { id: ruleId } });
  if (!rule) return actionError("Eintrag nicht gefunden.");

  const neighbor = await db.clubRule.findFirst({
    where: { section: rule.section, sortOrder: direction === "up" ? { lt: rule.sortOrder } : { gt: rule.sortOrder } },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return actionSuccess();

  await db.$transaction([
    db.clubRule.update({ where: { id: rule.id }, data: { sortOrder: neighbor.sortOrder } }),
    db.clubRule.update({ where: { id: neighbor.id }, data: { sortOrder: rule.sortOrder } }),
  ]);
  revalidatePath("/clubregeln");
  return actionSuccess();
}
