import { AdminFormCard, AdminSubmitRow, Field, inputClassName, textareaClassName } from "@/components/admin/form-primitives";
import type { TopicListItem } from "@/features/admin/topics";
import { getServerI18n } from "@/i18n/server";

export async function TopicForm({
  action,
  initialValue,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  initialValue?: TopicListItem | null;
  submitLabel: string;
}) {
  const { t } = await getServerI18n();
  return (
    <form action={action}>
      <input type="hidden" name="id" defaultValue={initialValue?.id ?? ""} />
      <AdminFormCard title={initialValue ? t("admin.topics.form.editTitle") : t("admin.topics.form.newTitle")}>
        <div className="grid gap-4">
          <Field label={t("admin.topics.form.name")}>
            <input name="name" defaultValue={initialValue?.name ?? ""} className={inputClassName()} />
          </Field>
          <Field label={t("admin.topics.form.slug")}>
            <input name="slug" defaultValue={initialValue?.slug ?? ""} className={inputClassName()} />
          </Field>
          <Field label={t("admin.topics.form.description")}>
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
