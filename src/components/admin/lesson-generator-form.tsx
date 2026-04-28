import { SearchableMultiSelect } from "@/components/admin/searchable-multi-select";
import { AdminFormCard, Field, inputClassName } from "@/components/admin/form-primitives";
import { Button } from "@/components/ui/button";
import type { LessonGeneratorInput, LessonGeneratorTagOption } from "@/features/admin/lesson-generator";
import { getServerI18n } from "@/i18n/server";

export async function LessonGeneratorForm({
  tagOptions,
  initialValue,
}: {
  tagOptions: LessonGeneratorTagOption[];
  initialValue: LessonGeneratorInput | null;
}) {
  const { t, link } = await getServerI18n();

  return (
    <form method="GET" action={link("/admin/lesson-generator")} className="space-y-6">
      <AdminFormCard
        title={t("admin.lessonGenerator.form.title")}
        description={t("admin.lessonGenerator.form.description")}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("admin.lessonGenerator.form.hskLevel")}>
            <select
              name="hsk"
              defaultValue={initialValue?.hskLevel ?? 1}
              className={inputClassName()}
              required
            >
              {Array.from({ length: 9 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  HSK {value}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("admin.lessonGenerator.form.targetWordCount")}>
            <input
              type="number"
              name="target_count"
              min={5}
              max={30}
              defaultValue={initialValue?.targetWordCount ?? 18}
              className={inputClassName()}
              required
            />
          </Field>

          <div className="md:col-span-2">
            <Field label={t("admin.lessonGenerator.form.topicTags")}>
              <SearchableMultiSelect
                name="topic_tags"
                options={tagOptions.map((tag) => ({ value: tag.slug, label: tag.label }))}
                defaultValue={initialValue?.topicTagSlugs ?? []}
                placeholder={t("admin.lessonGenerator.form.topicTagsPlaceholder")}
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <input
              type="checkbox"
              name="exclude_published"
              defaultChecked={initialValue?.excludePublishedLessonWords ?? true}
            />
            <span className="text-sm font-medium text-foreground">
              {t("admin.lessonGenerator.form.excludePublishedLessonWords")}
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <input
              type="checkbox"
              name="include_unapproved"
              defaultChecked={initialValue?.includeUnapprovedWords ?? false}
            />
            <span className="text-sm font-medium text-foreground">
              {t("admin.lessonGenerator.form.includeUnapprovedWords")}
            </span>
          </label>

          <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <input
              type="checkbox"
              name="allow_reused"
              defaultChecked={initialValue?.allowReusedWords ?? false}
            />
            <span className="text-sm font-medium text-foreground">
              {t("admin.lessonGenerator.form.allowReusedWords")}
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit">{t("admin.lessonGenerator.form.generate")}</Button>
        </div>
      </AdminFormCard>
    </form>
  );
}
