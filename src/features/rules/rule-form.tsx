import type { RuleSection } from "@/generated/prisma/enums";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import type { ActionState } from "@/lib/action-state";
import { RULE_SECTION_LABELS, RULE_SECTIONS } from "@/lib/labels";

export function RuleForm({
  action,
  rule,
  section,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  rule?: { title: string; content: string; section: RuleSection };
  section?: RuleSection;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="section" label="Bereich">
          <Select name="section" defaultValue={rule?.section ?? section ?? "CLUB_RULES"}>
            {RULE_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {RULE_SECTION_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field name="title" label="Überschrift">
          <Input name="title" defaultValue={rule?.title} maxLength={120} required />
        </Field>
      </div>
      <Field name="content" label="Text" hint="Listen mit „- “ oder „1. “ am Zeilenanfang, **fett** mit zwei Sternchen, Leerzeile = neuer Absatz.">
        <Textarea name="content" defaultValue={rule?.content} rows={10} maxLength={5000} required />
      </Field>
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
