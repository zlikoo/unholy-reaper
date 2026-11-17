import type { Metadata } from "next";
import Link from "next/link";
import { NotebookPen, Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { PostCard } from "@/features/board/components/post-card";
import { can, visibleAudiences } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { db } from "@/lib/db";
import { POST_CATEGORIES, POST_CATEGORY_LABELS } from "@/lib/labels";
import { getParam, pickEnum } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Schwarzes Brett" };

export default async function BoardPage({ searchParams }: PageProps<"/schwarzes-brett">) {
  const user = await requireUser();
  const params = await searchParams;
  const category = pickEnum(getParam(params, "kategorie"), POST_CATEGORIES);

  const posts = await db.post.findMany({
    where: { audience: { in: visibleAudiences(user.role) }, ...(category ? { category } : {}) },
    include: { author: { select: { name: true, roadName: true } } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const moderator = can(user.role, "board.moderate");
  const canPost = can(user.role, "board.post");
  const filters = [{ key: "", label: "Alle" }, ...POST_CATEGORIES.map((c) => ({ key: c, label: POST_CATEGORY_LABELS[c] }))];

  return (
    <>
      <PageHeader
        title="Schwarzes Brett"
        description="Ankündigungen, Termine und Ausfahrten."
        actions={
          canPost && (
            <LinkButton href="/schwarzes-brett/neu">
              <Plus className="size-4" /> Aushang
            </LinkButton>
          )
        }
      />

      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Kategorien">
        {filters.map((f) => {
          const active = (category ?? "") === f.key;
          return (
            <Link
              key={f.key || "alle"}
              href={f.key ? `/schwarzes-brett?kategorie=${f.key}` : "/schwarzes-brett"}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 font-display text-xs uppercase tracking-wider transition-colors",
                active ? "border-blood-bright bg-blood/20 text-bone" : "border-line text-ash hover:border-ash/50 hover:text-bone",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {posts.length === 0 ? (
        <EmptyState title="Keine Aushänge" icon={<NotebookPen className="size-8" />}>
          {canPost ? "Leg den ersten Aushang an." : "Hier ist gerade nichts angeschlagen."}
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canEdit={moderator || (canPost && post.authorId === user.id)}
              canPin={moderator}
            />
          ))}
        </div>
      )}
    </>
  );
}
