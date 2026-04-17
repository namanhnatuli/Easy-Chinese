import Link from "next/link";

import { AdminFormCard, AdminSubmitRow, Field, inputClassName, textareaClassName } from "@/components/admin/form-primitives";
import { buttonVariants } from "@/components/ui/button";
import type { AdminSelectOption, AdminWordEditor } from "@/features/admin/words";

interface WordFormProps {
  action: (formData: FormData) => Promise<void>;
  topics: AdminSelectOption[];
  radicals: AdminSelectOption[];
  initialValue?: AdminWordEditor | null;
  submitLabel: string;
}

export function WordForm({
  action,
  topics,
  radicals,
  initialValue,
  submitLabel,
}: WordFormProps) {
  const word = initialValue?.word;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" defaultValue={word?.id ?? ""} />

      <AdminFormCard
        title="Word details"
        description="Use one example per line in the format: Chinese | Pinyin | Vietnamese meaning"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Slug">
            <input name="slug" defaultValue={word?.slug ?? ""} className={inputClassName()} />
          </Field>
          <Field label="HSK level">
            <input
              name="hsk_level"
              type="number"
              min={1}
              max={9}
              defaultValue={word?.hsk_level ?? 1}
              className={inputClassName()}
            />
          </Field>
          <Field label="Simplified">
            <input
              name="simplified"
              defaultValue={word?.simplified ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label="Traditional">
            <input
              name="traditional"
              defaultValue={word?.traditional ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label="Hanzi">
            <input name="hanzi" defaultValue={word?.hanzi ?? ""} className={inputClassName()} />
          </Field>
          <Field label="Pinyin">
            <input name="pinyin" defaultValue={word?.pinyin ?? ""} className={inputClassName()} />
          </Field>
          <Field label="Han-Viet">
            <input
              name="han_viet"
              defaultValue={word?.han_viet ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label="English meaning">
            <input
              name="english_meaning"
              defaultValue={word?.english_meaning ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label="Vietnamese meaning">
            <input
              name="vietnamese_meaning"
              defaultValue={word?.vietnamese_meaning ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label="Topic">
            <select name="topic_id" defaultValue={word?.topic_id ?? ""} className={inputClassName()}>
              <option value="">No topic</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Radical">
            <select name="radical_id" defaultValue={word?.radical_id ?? ""} className={inputClassName()}>
              <option value="">No radical</option>
              {radicals.map((radical) => (
                <option key={radical.id} value={radical.id}>
                  {radical.label}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={word?.is_published ?? false}
            />
            <span className="text-sm font-medium text-foreground">Published</span>
          </label>
          <div className="md:col-span-2">
            <Field label="Notes">
              <textarea
                name="notes"
                defaultValue={word?.notes ?? ""}
                className={textareaClassName()}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Examples">
              <textarea
                name="examples_text"
                defaultValue={initialValue?.examplesText ?? ""}
                className={textareaClassName()}
              />
            </Field>
          </div>
        </div>

        <AdminSubmitRow
          submitLabel={submitLabel}
          secondaryAction={
            <Link
              href="/admin/words"
              className={buttonVariants({ variant: "outline" })}
            >
              Cancel
            </Link>
          }
        />
      </AdminFormCard>
    </form>
  );
}
