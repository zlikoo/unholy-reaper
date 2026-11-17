import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { AccessDenied, BackLink } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { updatePostAction } from "@/features/board/actions";
import { PostForm } from "@/features/board/components/post-form";
import { can, visibleAudiences } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Aushang bearbeiten" };

export default async function EditPostPage({ params }: PageProps<"/schwarzes-brett/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const post = await db.post.findUnique({ where: { id } });
  if (!post || !visibleAudiences(user.role).includes(post.audience)) notFound();

  const moderator = can(user.role, "board.moderate");
  if (!moderator && !(post.authorId === user.id && can(user.role, "board.post"))) {
    return <AccessDenied message="Du kannst nur deine eigenen Aushänge bearbeiten." />;
  }

  return (
    <>
      <PageHeader title="Aushang bearbeiten" back={<BackLink href="/schwarzes-brett">Zum Schwarzen Brett</BackLink>} />
      <Card className="max-w-3xl">
        <CardBody>
          <PostForm
            action={updatePostAction.bind(null, post.id)}
            post={post}
            audiences={visibleAudiences(user.role)}
            canPin={moderator}
            submitLabel="Speichern"
          />
        </CardBody>
      </Card>
    </>
  );
}
