import { AdminFormCard, AdminSubmitRow, Field, inputClassName, textareaClassName } from "@/components/admin/form-primitives";
import type { TopicListItem } from "@/features/admin/topics";

export function TopicForm({
  action,
  initialValue,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  initialValue?: TopicListItem | null;
  submitLabel: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" defaultValue={initialValue?.id ?? ""} />
      <AdminFormCard title={initialValue ? "Edit topic" : "New topic"}>
        <div className="grid gap-4">
          <Field label="Name">
            <input name="name" defaultValue={initialValue?.name ?? ""} className={inputClassName()} />
          </Field>
          <Field label="Slug">
            <input name="slug" defaultValue={initialValue?.slug ?? ""} className={inputClassName()} />
          </Field>
          <Field label="Description">
            <textarea
              name="description"
              defaultValue={initialValue?.description ?? ""}
              className={textareaClassName()}
            />
          </Field>
        </div>
        <AdminSubmitRow submitLabel={submitLabel} />
      </AdminFormCard>
    </form>
  );
}
