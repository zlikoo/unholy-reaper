import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/form";
import { AccessDenied, BackLink } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { deleteRuleAction, updateRuleAction } from "@/features/rules/actions";
import { RuleForm } from "@/features/rules/rule-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Eintrag bearbeiten" };

export default async function EditRulePage({ params }: PageProps<"/clubregeln/[id]">) {
  const user = await requireUser();
  if (!can(user.role, "rules.manage")) {
    return <AccessDenied message="Die Clubregeln pflegen President, Vice President und Secretary/Treasurer." />;
  }
  const { id } = await params;
  const rule = await db.clubRule.findUnique({ where: { id } });
  if (!rule) notFound();

  return (
    <>
      <PageHeader title="Eintrag bearbeiten" back={<BackLink href="/clubregeln">Zu den Clubregeln</BackLink>} />
      <Card className="max-w-3xl">
        <CardHeader
          title={rule.title}
          actions={
            <ActionButton action={deleteRuleAction.bind(null, rule.id)} confirmMessage={`„${rule.title}“ löschen?`} variant="danger">
              <Trash2 className="size-3.5" /> Löschen
            </ActionButton>
          }
        />
        <CardBody>
          <RuleForm action={updateRuleAction.bind(null, rule.id)} rule={rule} submitLabel="Speichern" />
        </CardBody>
      </Card>
    </>
  );
}
