import type { Role } from "@/generated/prisma/enums";
import { ActionForm, Checkbox, Field, Input, SubmitButton, Textarea } from "@/components/ui/form";
import type { ActionState } from "@/lib/action-state";
import { ROLE_LABELS, ROLES } from "@/lib/labels";

type LockerDefaults = {
  name: string;
  number: string | null;
  location: string | null;
  notes: string | null;
  hasCode: boolean;
  hasPassword: boolean;
  roles: Role[];
};

export function LockerForm({
  action,
  locker,
  currentRole,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  locker?: LockerDefaults;
  currentRole: Role;
  submitLabel: string;
}) {
  const selectable = ROLES.filter((r) => r !== "HANGAROUND");
  const defaultRoles = locker?.roles ?? ["PRESIDENT", "VICE_PRESIDENT", "SERGEANT_AT_ARMS", currentRole];

  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Bezeichnung">
          <Input name="name" defaultValue={locker?.name} placeholder="z. B. Clubhaus Keller" maxLength={60} required />
        </Field>
        <Field name="number" label="Fachnummer">
          <Input name="number" defaultValue={locker?.number ?? ""} placeholder="z. B. 01" maxLength={10} />
        </Field>
        <Field name="location" label="Standort" className="sm:col-span-2">
          <Input name="location" defaultValue={locker?.location ?? ""} placeholder="z. B. Clubhaus Sandy Shores, Keller" maxLength={120} />
        </Field>
        <Field
          name="code"
          label="Zahlenschloss-Code"
          hint={locker?.hasCode ? "Leer lassen = unverändert." : "3 bis 12 Ziffern."}
        >
          <Input name="code" inputMode="numeric" autoComplete="off" maxLength={12} placeholder={locker?.hasCode ? "••••" : ""} />
          {locker?.hasCode && <Checkbox name="clearCode" label="Code entfernen" />}
        </Field>
        <Field name="password" label="Passwort" hint={locker?.hasPassword ? "Leer lassen = unverändert." : undefined}>
          <Input name="password" autoComplete="off" maxLength={64} placeholder={locker?.hasPassword ? "••••••" : ""} />
          {locker?.hasPassword && <Checkbox name="clearPassword" label="Passwort entfernen" />}
        </Field>
      </div>

      <Field name="roles" label="Wer darf das Fach sehen?" hint="Der President sieht immer alle Fächer. Hangarounds nie.">
        <div className="grid gap-2 rounded-md border border-line bg-ink/40 p-3 sm:grid-cols-2">
          {selectable.map((role) =>
            role === "PRESIDENT" ? (
              <Checkbox key={role} name="roles-display" label={ROLE_LABELS[role]} defaultChecked disabled description="immer" />
            ) : (
              <Checkbox key={role} name="roles" value={role} label={ROLE_LABELS[role]} defaultChecked={defaultRoles.includes(role)} />
            ),
          )}
        </div>
      </Field>

      <Field name="notes" label="Notizen">
        <Textarea name="notes" defaultValue={locker?.notes ?? ""} rows={3} maxLength={1000} />
      </Field>
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
