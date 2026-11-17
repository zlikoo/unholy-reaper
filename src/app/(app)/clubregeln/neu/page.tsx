import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { AccessDenied, BackLink } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { createRuleAction } from "@/features/rules/actions";
import { RuleForm } from "@/features/rules/rule-form";
import { RULE_SECTIONS } from "@/lib/labels";
import { getParam, pickEnum } from "@/lib/search-params";

export const metadata: Metadata = { title: "Neuer Eintrag" };

export default async function NewRulePage({ searchParams }: PageProps<"/clubregeln/neu">) {
  const user = await requireUser();
  if (!can(user.role, "rules.manage")) {
    return <AccessDenied message="Die Clubregeln pflegen President, Vice President und Secretary/Treasurer." />;
  }
  const section = pickEnum(getParam(await searchParams, "bereich"), RULE_SECTIONS);
  return (
    <>
      <PageHeader title="Neuer Eintrag" back={<BackLink href="/clubregeln">Zu den Clubregeln</BackLink>} />
      <Card className="max-w-3xl">
        <CardBody>
          <RuleForm action={createRuleAction} section={section} submitLabel="Hinzufügen" />
        </CardBody>
      </Card>
    </>
  );
}
