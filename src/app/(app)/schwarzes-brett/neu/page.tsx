import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { AccessDenied, BackLink } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { createPostAction } from "@/features/board/actions";
import { PostForm } from "@/features/board/components/post-form";
import { can, visibleAudiences } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";

export const metadata: Metadata = { title: "Neuer Aushang" };

export default async function NewPostPage() {
  const user = await requireUser();
  if (!can(user.role, "board.post")) return <AccessDenied message="Aushänge veröffentlichen dürfen Fullpatches und Officers." />;

  return (
    <>
      <PageHeader title="Neuer Aushang" back={<BackLink href="/schwarzes-brett">Zum Schwarzen Brett</BackLink>} />
      <Card className="max-w-3xl">
        <CardBody>
          <PostForm
            action={createPostAction}
            audiences={visibleAudiences(user.role)}
            canPin={can(user.role, "board.moderate")}
            submitLabel="Aushängen"
          />
        </CardBody>
      </Card>
    </>
  );
}
