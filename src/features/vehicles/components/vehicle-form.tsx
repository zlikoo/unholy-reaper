import type { VehicleStatus, VehicleType } from "@/generated/prisma/enums";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import type { ActionState } from "@/lib/action-state";
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUSES, VEHICLE_TYPE_LABELS, VEHICLE_TYPES } from "@/lib/labels";
import type { MemberOption } from "@/features/members/queries";

type VehicleDefaults = {
  model: string;
  plate: string;
  type: VehicleType;
  ownerId: string | null;
  status: VehicleStatus;
  location: string | null;
  notes: string | null;
  imageUrl: string | null;
};

export function VehicleForm({
  action,
  vehicle,
  members,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  vehicle?: VehicleDefaults;
  members: MemberOption[];
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="model" label="Modell">
          <Input name="model" defaultValue={vehicle?.model} placeholder="z. B. Western Daemon" maxLength={80} required />
        </Field>
        <Field name="plate" label="Kennzeichen">
          <Input name="plate" defaultValue={vehicle?.plate} className="uppercase" maxLength={20} required />
        </Field>
        <Field name="type" label="Typ">
          <Select name="type" defaultValue={vehicle?.type ?? "MOTORCYCLE"}>
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {VEHICLE_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field name="ownerId" label="Besitzer">
          <Select name="ownerId" defaultValue={vehicle?.ownerId ?? ""}>
            <option value="">Club</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field name="status" label="Status">
          <Select name="status" defaultValue={vehicle?.status ?? "IN_GARAGE"}>
            {VEHICLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {VEHICLE_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
        <Field name="location" label="Standort">
          <Input name="location" defaultValue={vehicle?.location ?? ""} placeholder="z. B. Clubhaus Sandy Shores" maxLength={120} />
        </Field>
      </div>
      <Field name="imageUrl" label="Foto-URL" hint="Link zu einem Bild (z. B. Screenshot). Optional.">
        <Input name="imageUrl" type="url" defaultValue={vehicle?.imageUrl ?? ""} placeholder="https://…" maxLength={500} />
      </Field>
      <Field name="notes" label="Notizen">
        <Textarea name="notes" defaultValue={vehicle?.notes ?? ""} rows={4} maxLength={2000} />
      </Field>
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}

export function VehicleStatusForm({
  action,
  status,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  status: VehicleStatus;
}) {
  return (
    <ActionForm action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="status" label="Neuer Status">
          <Select name="status" defaultValue={status}>
            {VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VEHICLE_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field name="location" label="Neuer Standort" hint="Leer lassen = unverändert">
          <Input name="location" maxLength={120} />
        </Field>
      </div>
      <SubmitButton variant="secondary">Status speichern</SubmitButton>
    </ActionForm>
  );
}
