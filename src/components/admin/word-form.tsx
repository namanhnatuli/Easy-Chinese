import Link from "next/link";

import { AdminFormCard, AdminSubmitRow, Field, inputClassName, textareaClassName } from "@/components/admin/form-primitives";
import { SearchableMultiSelect } from "@/components/admin/searchable-multi-select";
import { buttonVariants } from "@/components/ui/button";
import type { AdminSelectOption, AdminWordEditor } from "@/features/admin/words";
import { getServerI18n } from "@/i18n/server";

interface WordFormProps {
  action: (formData: FormData) => Promise<void>;
  topics: AdminSelectOption[];
  radicals: AdminSelectOption[];
  initialValue?: AdminWordEditor | null;
  submitLabel: string;
}

export async function WordForm({
  action,
  topics,
  radicals,
  initialValue,
  submitLabel,
}: WordFormProps) {
  const { t, link } = await getServerI18n();
  const word = initialValue?.word;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" defaultValue={word?.id ?? ""} />

      <AdminFormCard
        title={t("admin.words.form.title")}
        description={t("admin.words.form.description")}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("admin.words.form.slug")}>
            <input name="slug" defaultValue={word?.slug ?? ""} className={inputClassName()} />
          </Field>
          <Field label={t("admin.words.form.hskLevel")}>
            <input
              name="hsk_level"
              type="number"
              min={1}
              max={9}
              defaultValue={word?.hsk_level ?? 1}
              className={inputClassName()}
            />
          </Field>
          <Field label={t("admin.words.form.simplified")}>
            <input
              name="simplified"
              defaultValue={word?.simplified ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label={t("admin.words.form.traditional")}>
            <input
              name="traditional"
              defaultValue={word?.traditional ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label={t("admin.words.form.hanzi")}>
            <input name="hanzi" defaultValue={word?.hanzi ?? ""} className={inputClassName()} />
          </Field>
          <Field label={t("admin.words.form.pinyin")}>
            <input name="pinyin" defaultValue={word?.pinyin ?? ""} className={inputClassName()} />
          </Field>
          <Field label={t("admin.words.form.hanViet")}>
            <input
              name="han_viet"
              defaultValue={word?.han_viet ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label={t("admin.words.form.englishMeaning")}>
            <input
              name="english_meaning"
              defaultValue={word?.english_meaning ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label={t("admin.words.form.vietnameseMeaning")}>
            <input
              name="vietnamese_meaning"
              defaultValue={word?.vietnamese_meaning ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label={t("admin.words.form.topic")}>
            <select name="topic_id" defaultValue={word?.topic_id ?? ""} className={inputClassName()}>
              <option value="">{t("admin.words.form.noTopic")}</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("admin.words.form.radical")}>
            <SearchableMultiSelect
              name="radical_ids"
              options={radicals.map((radical) => ({
                value: radical.id,
                label: radical.label,
              }))}
              defaultValue={word?.radical_ids ?? []}
            />
          </Field>
          <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={word?.is_published ?? false}
            />
            <span className="text-sm font-medium text-foreground">{t("admin.words.form.published")}</span>
          </label>
          <div className="md:col-span-2">
            <Field label={t("admin.words.form.notes")}>
              <textarea
                name="notes"
                defaultValue={word?.notes ?? ""}
                className={textareaClassName()}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("admin.words.form.examples")}>
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
              href={link("/admin/words")}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("common.cancel")}
            </Link>
          }
        />
      </AdminFormCard>
    </form>
  );
}
