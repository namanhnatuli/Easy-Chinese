import Link from "next/link";

import { AdminFormCard, AdminSubmitRow, Field, inputClassName, textareaClassName } from "@/components/admin/form-primitives";
import { buttonVariants } from "@/components/ui/button";
import type { AdminGrammarEditor } from "@/features/admin/grammar";
import { getServerI18n } from "@/i18n/server";

export async function GrammarPointForm({
  action,
  initialValue,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  initialValue?: AdminGrammarEditor | null;
  submitLabel: string;
}) {
  const { t, link } = await getServerI18n();
  const grammarPoint = initialValue?.grammarPoint;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" defaultValue={grammarPoint?.id ?? ""} />

      <AdminFormCard
        title={t("admin.grammar.form.title")}
        description={t("admin.grammar.form.description")}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("admin.grammar.form.titleLabel")}>
            <input name="title" defaultValue={grammarPoint?.title ?? ""} className={inputClassName()} />
          </Field>
          <Field label={t("admin.grammar.form.slug")}>
            <input name="slug" defaultValue={grammarPoint?.slug ?? ""} className={inputClassName()} />
          </Field>
          <Field label={t("admin.grammar.form.hskLevel")}>
            <input
              name="hsk_level"
              type="number"
              min={1}
              max={9}
              defaultValue={grammarPoint?.hsk_level ?? 1}
              className={inputClassName()}
            />
          </Field>
          <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={grammarPoint?.is_published ?? false}
            />
            <span className="text-sm font-medium text-foreground">{t("admin.grammar.form.published")}</span>
          </label>
          <div className="md:col-span-2">
            <Field label={t("admin.grammar.form.structureText")}>
              <input
                name="structure_text"
                defaultValue={grammarPoint?.structure_text ?? ""}
                className={inputClassName()}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("admin.grammar.form.vietnameseExplanation")}>
              <textarea
                name="explanation_vi"
                defaultValue={grammarPoint?.explanation_vi ?? ""}
                className={textareaClassName()}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("admin.grammar.form.notes")}>
              <textarea
                name="notes"
                defaultValue={grammarPoint?.notes ?? ""}
                className={textareaClassName()}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("admin.grammar.form.examples")}>
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
              href={link("/admin/grammar")}
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
