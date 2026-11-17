import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { DetailItem } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { changeOwnPasswordAction } from "@/features/auth/actions";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/password";
import { requireUser } from "@/features/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS, ROLE_TONES } from "@/lib/labels";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const member = await db.user.findUniqueOrThrow({ where: { id: user.id } });

  return (
    <>
      <PageHeader title="Mein Profil" description="Deine Daten im Club und dein Passwort." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Mitgliedsdaten" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4">
              <DetailItem label="Name">{member.name}</DetailItem>
              <DetailItem label="Road Name">{member.roadName ?? "–"}</DetailItem>
              <DetailItem label="Benutzername">{member.username}</DetailItem>
              <DetailItem label="Rang">
                <Badge tone={ROLE_TONES[member.role]}>{ROLE_LABELS[member.role]}</Badge>
              </DetailItem>
              <DetailItem label="Beigetreten">{formatDate(member.joinedAt)}</DetailItem>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Passwort ändern" description="Andere Geräte werden danach abgemeldet." />
          <CardBody>
            <ActionForm action={changeOwnPasswordAction} resetOnSuccess className="space-y-4">
              <Field name="currentPassword" label="Aktuelles Passwort">
                <Input name="currentPassword" type="password" autoComplete="current-password" required />
              </Field>
              <Field name="newPassword" label="Neues Passwort" hint={`Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`}>
                <Input name="newPassword" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} required />
              </Field>
              <Field name="confirmPassword" label="Neues Passwort wiederholen">
                <Input name="confirmPassword" type="password" autoComplete="new-password" required />
              </Field>
              <SubmitButton>Passwort speichern</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
