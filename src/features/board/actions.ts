"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Post } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { actionError, actionSuccess, noPermission, validationError, type ActionState } from "@/lib/action-state";
import { POST_AUDIENCE_LABELS } from "@/lib/labels";
import { formToObject } from "@/lib/validation";
import { logActivity } from "@/features/activity/log";
import { can, visibleAudiences } from "@/features/auth/permissions";
import { requireUser, type SessionUser } from "@/features/auth/session";
import { postSchema } from "./schemas";

function revalidateBoard() {
  revalidatePath("/schwarzes-brett");
  revalidatePath("/");
}

/** Eigene Aushänge darf man bearbeiten, Moderatoren alle, die sie sehen können. */
function mayEdit(user: SessionUser, post: Post) {
  if (!visibleAudiences(user.role).includes(post.audience)) return false;
  if (can(user.role, "board.moderate")) return true;
  return post.authorId === user.id && can(user.role, "board.post");
}

export async function createPostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "board.post")) return noPermission();

  const parsed = postSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;
  if (!visibleAudiences(user.role).includes(data.audience)) {
    return actionError("Für diese Sichtbarkeit reicht dein Rang nicht.", { audience: ["Nicht erlaubt."] });
  }

  const post = await db.post.create({
    data: { ...data, pinned: can(user.role, "board.moderate") ? data.pinned : false, authorId: user.id },
  });
  await logActivity({
    userId: user.id,
    action: "post.create",
    entityType: "POST",
    entityId: post.id,
    summary: `Aushang „${post.title}“ veröffentlicht (${POST_AUDIENCE_LABELS[post.audience]})`,
  });

  revalidateBoard();
  redirect("/schwarzes-brett");
}

export async function updatePostAction(postId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || !mayEdit(user, post)) return noPermission();

  const parsed = postSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;
  if (!visibleAudiences(user.role).includes(data.audience)) {
    return actionError("Für diese Sichtbarkeit reicht dein Rang nicht.", { audience: ["Nicht erlaubt."] });
  }

  await db.post.update({
    where: { id: post.id },
    data: { ...data, pinned: can(user.role, "board.moderate") ? data.pinned : post.pinned },
  });
  await logActivity({
    userId: user.id,
    action: "post.update",
    entityType: "POST",
    entityId: post.id,
    summary: `Aushang „${data.title}“ bearbeitet`,
  });

  revalidateBoard();
  redirect("/schwarzes-brett");
}

export async function deletePostAction(postId: string): Promise<ActionState> {
  const user = await requireUser();
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || !mayEdit(user, post)) return noPermission();

  await db.post.delete({ where: { id: post.id } });
  await logActivity({
    userId: user.id,
    action: "post.delete",
    entityType: "POST",
    entityId: post.id,
    summary: `Aushang „${post.title}“ entfernt`,
  });

  revalidateBoard();
  return actionSuccess("Aushang entfernt.");
}

export async function togglePinAction(postId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "board.moderate")) return noPermission();
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || !visibleAudiences(user.role).includes(post.audience)) return actionError("Aushang nicht gefunden.");

  await db.post.update({ where: { id: post.id }, data: { pinned: !post.pinned } });
  await logActivity({
    userId: user.id,
    action: post.pinned ? "post.unpin" : "post.pin",
    entityType: "POST",
    entityId: post.id,
    summary: `Aushang „${post.title}“ ${post.pinned ? "losgelöst" : "angepinnt"}`,
  });

  revalidateBoard();
  return actionSuccess();
}
