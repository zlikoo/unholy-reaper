import Link from "next/link";
import { CalendarClock, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import type { Post } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/form";
import { RichText } from "@/components/ui/rich-text";
import { formatDateTime, formatRelative } from "@/lib/format";
import { memberDisplayName, POST_AUDIENCE_LABELS, POST_CATEGORY_LABELS, POST_CATEGORY_TONES } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { deletePostAction, togglePinAction } from "../actions";

type PostWithAuthor = Post & { author: { name: string; roadName: string | null } | null };

export function PostCard({
  post,
  canEdit = false,
  canPin = false,
  compact = false,
}: {
  post: PostWithAuthor;
  canEdit?: boolean;
  canPin?: boolean;
  compact?: boolean;
}) {
  return (
    <Card className={cn("relative overflow-hidden", post.pinned && "border-brass/40")}>
      {post.pinned && <div className="absolute inset-y-0 left-0 w-1 bg-brass" aria-hidden />}
      <div className={cn("space-y-3", compact ? "p-4" : "p-5")}>
        <div className="flex flex-wrap items-center gap-2">
          {post.pinned && (
            <Badge tone="brass">
              <Pin className="size-3" aria-hidden /> Angepinnt
            </Badge>
          )}
          <Badge tone={POST_CATEGORY_TONES[post.category]}>{POST_CATEGORY_LABELS[post.category]}</Badge>
          {post.audience !== "ALL" && post.audience !== "PROSPECTS" && <Badge tone="red">{POST_AUDIENCE_LABELS[post.audience]}</Badge>}
        </div>
        <div>
          <h2 className={cn("font-display uppercase tracking-wide text-bone", compact ? "text-base" : "text-xl")}>{post.title}</h2>
          <p className="mt-0.5 text-xs text-ash">
            {post.author ? memberDisplayName(post.author) : "Unbekannt"} · {formatRelative(post.createdAt)}
          </p>
        </div>
        {post.eventAt && (
          <p className="inline-flex items-center gap-2 rounded-md border border-brass/30 bg-brass/10 px-3 py-1.5 text-sm text-amber-100">
            <CalendarClock className="size-4 text-brass" aria-hidden />
            {formatDateTime(post.eventAt)} Uhr
          </p>
        )}
        <RichText text={post.content} className={compact ? "line-clamp-4" : undefined} />
        {(canEdit || canPin) && !compact && (
          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            {canEdit && (
              <Link href={`/schwarzes-brett/${post.id}`} className={buttonClasses("ghost", "sm")}>
                <Pencil className="size-3.5" /> Bearbeiten
              </Link>
            )}
            {canPin && (
              <ActionButton action={togglePinAction.bind(null, post.id)} variant="ghost">
                {post.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                {post.pinned ? "Lösen" : "Anpinnen"}
              </ActionButton>
            )}
            {canEdit && (
              <ActionButton action={deletePostAction.bind(null, post.id)} variant="ghost" confirmMessage={`Aushang „${post.title}“ entfernen?`}>
                <Trash2 className="size-3.5" /> Entfernen
              </ActionButton>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
