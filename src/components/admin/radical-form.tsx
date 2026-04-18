import { AdminFormCard, AdminSubmitRow, Field, inputClassName } from "@/components/admin/form-primitives";
import type { RadicalListItem } from "@/features/admin/radicals";
import { getServerI18n } from "@/i18n/server";

export async function RadicalForm({
  action,
  initialValue,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  initialValue?: RadicalListItem | null;
  submitLabel: string;
}) {
  const { t } = await getServerI18n();
  return (
    <form action={action}>
      <input type="hidden" name="id" defaultValue={initialValue?.id ?? ""} />
      <AdminFormCard title={initialValue ? t("admin.radicals.form.editTitle") : t("admin.radicals.form.newTitle")}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("admin.radicals.form.radical")}>
            <input
              name="radical"
              defaultValue={initialValue?.radical ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label={t("admin.radicals.form.pinyin")}>
            <input
              name="pinyin"
              defaultValue={initialValue?.pinyin ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label={t("admin.radicals.form.meaning")}>
            <input
              name="meaning_vi"
              defaultValue={initialValue?.meaning_vi ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label={t("admin.radicals.form.strokes")}>
            <input
              name="stroke_count"
              type="number"
              min={0}
              defaultValue={initialValue?.stroke_count ?? 0}
              className={inputClassName()}
            />
          </Field>
        </div>
        <AdminSubmitRow submitLabel={submitLabel} />
      </AdminFormCard>
    </form>
  );
}
