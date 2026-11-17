import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import type { ActionState } from "@/lib/action-state";
import { toDateTimeInputValue } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { TRANSACTION_CATEGORIES, TRANSACTION_CATEGORY_LABELS } from "@/lib/labels";
import type { MemberOption } from "@/features/members/queries";

export function TransactionForm({
  action,
  members,
  threshold,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  members: MemberOption[];
  threshold: number;
}) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="type" label="Art">
          <Select name="type" defaultValue="DEPOSIT">
            <option value="DEPOSIT">Einzahlung</option>
            <option value="WITHDRAWAL">Auszahlung</option>
          </Select>
        </Field>
        <Field name="amount" label="Betrag in $" hint={`Auszahlungen über ${formatMoney(threshold)} brauchen eine Freigabe.`}>
          <Input name="amount" inputMode="numeric" placeholder="z. B. 2500" autoComplete="off" required />
        </Field>
        <Field name="category" label="Kategorie">
          <Select name="category" defaultValue="DONATION">
            {TRANSACTION_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {TRANSACTION_CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </Field>
        <Field name="date" label="Datum">
          <Input name="date" type="datetime-local" defaultValue={toDateTimeInputValue(new Date())} required />
        </Field>
        <Field name="memberId" label="Mitglied" hint="Wer hat eingezahlt bzw. wer bekommt das Geld? Optional.">
          <Select name="memberId" defaultValue="">
            <option value="">Kein Mitglied</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field name="description" label="Beschreibung">
          <Input name="description" maxLength={200} placeholder="z. B. Monatsbeitrag" required />
        </Field>
      </div>
      <SubmitButton>Buchen</SubmitButton>
    </ActionForm>
  );
}
