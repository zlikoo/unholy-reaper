import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import type { ActionState } from "@/lib/action-state";
import { toDateTimeInputValue } from "@/lib/dates";
import type { LockerOption } from "@/features/lockers/access";
import type { MemberOption } from "@/features/members/queries";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

function LockerSelect({ lockers, defaultValue, label = "Schließfach" }: { lockers: LockerOption[]; defaultValue?: string | null; label?: string }) {
  return (
    <Field name="lockerId" label={label}>
      <Select name="lockerId" defaultValue={defaultValue ?? lockers[0]?.id ?? ""}>
        <option value="">Ohne Schließfach</option>
        {lockers.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function DateField({ label = "Datum" }: { label?: string }) {
  return (
    <Field name="date" label={label}>
      <Input name="date" type="datetime-local" defaultValue={toDateTimeInputValue(new Date())} required />
    </Field>
  );
}

function QuantityField({ max, defaultValue }: { max: number; defaultValue?: number }) {
  return (
    <Field name="quantity" label={`Menge (max. ${max})`}>
      <Input name="quantity" type="number" min={1} max={max} defaultValue={defaultValue ?? max} required />
    </Field>
  );
}

export function WeaponCreateForm({ action, lockers }: { action: Action; lockers: LockerOption[] }) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Waffe / Gegenstand">
          <Input name="name" placeholder="z. B. Pistole .50" maxLength={80} required />
        </Field>
        <Field name="serialNumber" label="Seriennummer" hint="Frei wählbar, optional.">
          <Input name="serialNumber" placeholder="z. B. UR-P-004" maxLength={40} />
        </Field>
        <Field name="quantity" label="Menge">
          <Input name="quantity" type="number" min={1} defaultValue={1} required />
        </Field>
        <LockerSelect lockers={lockers} />
        <DateField label="Eingelagert am" />
      </div>
      <Field name="notes" label="Notizen">
        <Textarea name="notes" rows={3} maxLength={1000} />
      </Field>
      <SubmitButton>Einlagern</SubmitButton>
    </ActionForm>
  );
}

export function WeaponEditForm({
  action,
  weapon,
  lockers,
}: {
  action: Action;
  weapon: { name: string; serialNumber: string | null; quantity: number; notes: string | null; lockerId: string | null; status: string };
  lockers: LockerOption[];
}) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Waffe / Gegenstand">
          <Input name="name" defaultValue={weapon.name} maxLength={80} required />
        </Field>
        <Field name="serialNumber" label="Seriennummer">
          <Input name="serialNumber" defaultValue={weapon.serialNumber ?? ""} maxLength={40} />
        </Field>
        <Field name="quantity" label="Menge" hint="Nur zur Korrektur, z. B. nach einer Inventur.">
          <Input name="quantity" type="number" min={1} defaultValue={weapon.quantity} required />
        </Field>
        {weapon.status === "IN_STOCK" && <LockerSelect lockers={lockers} defaultValue={weapon.lockerId ?? ""} label="Schließfach (umlagern)" />}
      </div>
      <Field name="notes" label="Notizen">
        <Textarea name="notes" defaultValue={weapon.notes ?? ""} rows={3} maxLength={1000} />
      </Field>
      <SubmitButton variant="secondary">Speichern</SubmitButton>
    </ActionForm>
  );
}

export function IssueForm({ action, max, members }: { action: Action; max: number; members: MemberOption[] }) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="memberId" label="Ausgeben an">
          <Select name="memberId" defaultValue="" required>
            <option value="" disabled>
              Mitglied wählen …
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <QuantityField max={max} defaultValue={1} />
        <DateField label="Ausgegeben am" />
        <Field name="note" label="Notiz">
          <Input name="note" maxLength={300} placeholder="optional" />
        </Field>
      </div>
      <SubmitButton>Ausgeben</SubmitButton>
    </ActionForm>
  );
}

export function ReturnForm({
  action,
  max,
  lockers,
  defaultLockerId,
  submitLabel,
}: {
  action: Action;
  max: number;
  lockers: LockerOption[];
  defaultLockerId?: string | null;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <QuantityField max={max} />
        <LockerSelect lockers={lockers} defaultValue={defaultLockerId} label="Zurück in Schließfach" />
        <DateField />
        <Field name="note" label="Notiz">
          <Input name="note" maxLength={300} placeholder="optional" />
        </Field>
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}

export function LostForm({ action, max }: { action: Action; max: number }) {
  return (
    <ActionForm action={action} className="space-y-4" confirmMessage="Wirklich als verloren melden?">
      <div className="grid gap-4 sm:grid-cols-2">
        <QuantityField max={max} />
        <DateField />
        <Field name="note" label="Was ist passiert?" className="sm:col-span-2">
          <Input name="note" maxLength={300} placeholder="z. B. bei Polizeikontrolle abgenommen" />
        </Field>
      </div>
      <SubmitButton variant="danger">Als verloren melden</SubmitButton>
    </ActionForm>
  );
}
