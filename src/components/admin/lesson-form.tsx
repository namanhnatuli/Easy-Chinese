import Link from "next/link";

import { AdminFormCard, AdminSubmitRow, Field, inputClassName, textareaClassName } from "@/components/admin/form-primitives";
import { buttonVariants } from "@/components/ui/button";
import type { AdminLessonEditor, LessonCompositionOption } from "@/features/admin/lessons";
import { getServerI18n } from "@/i18n/server";

async function SelectionGrid({
  title,
  prefix,
  options,
  selectedMap,
}: {
  title: string;
  prefix: "word" | "grammar";
  options: LessonCompositionOption[];
  selectedMap: Record<string, number>;
}) {
  return (
    <AdminFormCard title={title}>
      <div className="space-y-3">
        {options.map((option, index) => {
          const selected = selectedMap[option.id];
          return (
            <div
              key={option.id}
              className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 md:grid-cols-[1fr_120px]"
            >
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name={`${prefix}_select_${option.id}`}
                  defaultChecked={typeof selected === "number"}
                />
                <span className="text-sm text-slate-800">{option.label}</span>
              </label>
              <input
                type="number"
                min={1}
                name={`${prefix}_order_${option.id}`}
                defaultValue={selected ?? index + 1}
                className={inputClassName()}
              />
            </div>
          );
        })}
      </div>
    </AdminFormCard>
  );
}

export async function LessonForm({
  action,
  initialValue,
  topics,
  words,
  grammarPoints,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  initialValue?: AdminLessonEditor | null;
  topics: LessonCompositionOption[];
  words: LessonCompositionOption[];
  grammarPoints: LessonCompositionOption[];
  submitLabel: string;
}) {
  const { t, link } = await getServerI18n();
  const lesson = initialValue?.lesson;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" defaultValue={lesson?.id ?? ""} />

      <AdminFormCard title={t("admin.lessons.form.detailsTitle")}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("admin.lessons.form.titleLabel")}>
            <input name="title" defaultValue={lesson?.title ?? ""} className={inputClassName()} />
          </Field>
          <Field label={t("admin.lessons.form.slug")}>
            <input name="slug" defaultValue={lesson?.slug ?? ""} className={inputClassName()} />
          </Field>
          <Field label={t("admin.lessons.form.hskLevel")}>
            <input
              name="hsk_level"
              type="number"
              min={1}
              max={9}
              defaultValue={lesson?.hsk_level ?? 1}
              className={inputClassName()}
            />
          </Field>
          <Field label={t("admin.lessons.form.sortOrder")}>
            <input
              name="sort_order"
              type="number"
              min={0}
              defaultValue={lesson?.sort_order ?? 0}
              className={inputClassName()}
            />
          </Field>
          <Field label={t("admin.lessons.form.topic")}>
            <select name="topic_id" defaultValue={lesson?.topic_id ?? ""} className={inputClassName()}>
              <option value="">{t("admin.lessons.form.noTopic")}</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.label}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={lesson?.is_published ?? false}
            />
            <span className="text-sm font-medium text-foreground">{t("admin.lessons.form.published")}</span>
          </label>
          <div className="md:col-span-2">
            <Field label={t("admin.lessons.form.description")}>
              <textarea
                name="description"
                defaultValue={lesson?.description ?? ""}
                className={textareaClassName()}
              />
            </Field>
          </div>
        </div>

        <AdminSubmitRow
          submitLabel={submitLabel}
          secondaryAction={
            <Link
              href={link("/admin/lessons")}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("common.cancel")}
            </Link>
          }
        />
      </AdminFormCard>

      {await SelectionGrid({
        title: t("admin.lessons.form.orderedWords"),
        prefix: "word",
        options: words,
        selectedMap: initialValue?.selectedWordIds ?? {},
      })}

      {await SelectionGrid({
        title: t("admin.lessons.form.orderedGrammar"),
        prefix: "grammar",
        options: grammarPoints,
        selectedMap: initialValue?.selectedGrammarIds ?? {},
      })}
    </form>
  );
}
