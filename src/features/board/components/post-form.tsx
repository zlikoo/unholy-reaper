import type { PostAudience, PostCategory } from "@/generated/prisma/enums";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import type { ActionState } from "@/lib/action-state";
import { toDateTimeInputValue } from "@/lib/dates";
import { POST_AUDIENCE_LABELS, POST_CATEGORIES, POST_CATEGORY_LABELS } from "@/lib/labels";

export function PostForm({
  action,
  post,
  audiences,
  canPin,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  post?: { title: string; content: string; category: PostCategory; audience: PostAudience; eventAt: Date | null; pinned: boolean };
  audiences: PostAudience[];
  canPin: boolean;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="space-y-4">
      <Field name="title" label="Titel">
        <Input name="title" defaultValue={post?.title} maxLength={120} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="category" label="Kategorie">
          <Select name="category" defaultValue={post?.category ?? "INFO"}>
            {POST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {POST_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field name="audience" label="Sichtbar für">
          <Select name="audience" defaultValue={post?.audience ?? "PROSPECTS"}>
            {audiences.map((a) => (
              <option key={a} value={a}>
                {POST_AUDIENCE_LABELS[a]}
              </option>
            ))}
          </Select>
        </Field>
        <Field name="eventAt" label="Termin (optional)">
          <Input name="eventAt" type="datetime-local" defaultValue={post?.eventAt ? toDateTimeInputValue(post.eventAt) : ""} />
        </Field>
      </div>
      <Field name="content" label="Text" hint="Listen mit „- “ oder „1. “ am Zeilenanfang, **fett** mit zwei Sternchen.">
        <Textarea name="content" defaultValue={post?.content} rows={8} maxLength={5000} required />
      </Field>
      {canPin && <Checkbox name="pinned" label="Oben anpinnen" defaultChecked={post?.pinned} />}
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
