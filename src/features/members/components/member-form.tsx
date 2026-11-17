import type { Role } from "@/generated/prisma/enums";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import type { ActionState } from "@/lib/action-state";
import { toDateInputValue } from "@/lib/dates";
import { ROLE_LABELS, ROLES } from "@/lib/labels";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/password";
import type { MemberOption } from "../queries";

type MemberDefaults = {
  username: string;
  name: string;
  roadName: string | null;
  role: Role;
  joinedAt: Date;
  notes: string | null;
  sponsorId: string | null;
  active: boolean;
};

export function MemberForm({
  action,
  member,
  canAssignPresident,
  sponsors,
  isSelf = false,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  member?: MemberDefaults;
  canAssignPresident: boolean;
  sponsors: MemberOption[];
  isSelf?: boolean;
  submitLabel: string;
}) {
  const isNew = !member;
  const roles = ROLES.filter((role) => canAssignPresident || role !== "PRESIDENT" || member?.role === "PRESIDENT");

  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Name (Charakter)">
          <Input name="name" defaultValue={member?.name} maxLength={80} required />
        </Field>
        <Field name="roadName" label="Road Name" hint="Spitzname im Club, optional.">
          <Input name="roadName" defaultValue={member?.roadName ?? ""} maxLength={40} />
        </Field>
        <Field name="username" label="Benutzername" hint="Für den Login. Kleinbuchstaben, Ziffern, . _ -">
          <Input name="username" defaultValue={member?.username} autoCapitalize="none" spellCheck={false} maxLength={30} required />
        </Field>
        <Field name="role" label="Rang" hint={isSelf ? "Deinen eigenen Rang kann nur jemand anderes ändern." : undefined}>
          {isSelf && <input type="hidden" name="role" value={member?.role} />}
          <Select name={isSelf ? "role-display" : "role"} defaultValue={member?.role ?? "PROSPECT"} disabled={isSelf}>
            {roles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </Field>
        <Field name="joinedAt" label="Beitrittsdatum">
          <Input name="joinedAt" type="date" defaultValue={toDateInputValue(member?.joinedAt ?? new Date())} required />
        </Field>
        <Field name="sponsorId" label="Sponsor" hint="Fullpatch, der für einen Prospect oder Hangaround bürgt.">
          <Select name="sponsorId" defaultValue={member?.sponsorId ?? ""}>
            <option value="">Kein Sponsor</option>
            {sponsors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        {isNew && (
          <Field name="password" label="Start-Passwort" hint={`Mindestens ${PASSWORD_MIN_LENGTH} Zeichen. Das Mitglied kann es im Profil ändern.`}>
            <Input name="password" type="text" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} required />
          </Field>
        )}
      </div>
      <Field name="notes" label="Notizen">
        <Textarea name="notes" defaultValue={member?.notes ?? ""} rows={4} maxLength={2000} />
      </Field>
      <Field name="active" label="Status">
        {isSelf && <input type="hidden" name="active" value="on" />}
        <Checkbox
          name={isSelf ? "active-display" : "active"}
          label="Aktives Mitglied"
          description="Inaktive Mitglieder können sich nicht einloggen."
          defaultChecked={member?.active ?? true}
          disabled={isSelf}
        />
      </Field>
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
