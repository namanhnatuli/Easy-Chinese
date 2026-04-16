import { AdminFormCard, AdminSubmitRow, Field, inputClassName } from "@/components/admin/form-primitives";
import type { RadicalListItem } from "@/features/admin/radicals";

export function RadicalForm({
  action,
  initialValue,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  initialValue?: RadicalListItem | null;
  submitLabel: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" defaultValue={initialValue?.id ?? ""} />
      <AdminFormCard title={initialValue ? "Edit radical" : "New radical"}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Radical">
            <input
              name="radical"
              defaultValue={initialValue?.radical ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label="Pinyin">
            <input
              name="pinyin"
              defaultValue={initialValue?.pinyin ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label="Vietnamese meaning">
            <input
              name="meaning_vi"
              defaultValue={initialValue?.meaning_vi ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label="Stroke count">
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
