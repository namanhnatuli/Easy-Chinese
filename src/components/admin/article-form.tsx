import Link from "next/link";

import { SearchableMultiSelect } from "@/components/admin/searchable-multi-select";
import { AdminFormCard, AdminSubmitRow, Field, inputClassName, textareaClassName } from "@/components/admin/form-primitives";
import { buttonVariants } from "@/components/ui/button";
import type { AdminArticleEditor, ArticleOption } from "@/features/admin/articles";
import { LEARNING_ARTICLE_TYPE_OPTIONS } from "@/features/articles/constants";
import { getServerI18n } from "@/i18n/server";

export async function ArticleForm({
  action,
  initialValue,
  submitLabel,
  tags,
  words,
  grammarPoints,
}: {
  action: (formData: FormData) => Promise<void>;
  initialValue?: AdminArticleEditor | null;
  submitLabel: string;
  tags: ArticleOption[];
  words: ArticleOption[];
  grammarPoints: ArticleOption[];
}) {
  const { t, link } = await getServerI18n();
  const article = initialValue?.article;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" defaultValue={article?.id ?? ""} />

      <AdminFormCard
        title={t("admin.articles.form.title")}
        description={t("admin.articles.form.description")}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("admin.articles.form.titleLabel")}>
            <input name="title" defaultValue={article?.title ?? ""} className={inputClassName()} required />
          </Field>
          <Field label={t("admin.articles.form.slug")}>
            <input name="slug" defaultValue={article?.slug ?? ""} className={inputClassName()} required />
          </Field>
          <Field label={t("admin.articles.form.hskLevel")}>
            <input
              name="hsk_level"
              type="number"
              min={1}
              max={9}
              defaultValue={article?.hsk_level ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label={t("admin.articles.form.articleType")}>
            <select
              name="article_type"
              defaultValue={article?.article_type ?? "other"}
              className={inputClassName()}
              required
            >
              {LEARNING_ARTICLE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label={t("admin.articles.form.summary")}>
              <textarea
                name="summary"
                defaultValue={article?.summary ?? ""}
                className={textareaClassName("min-h-24")}
                required
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("admin.articles.form.contentMarkdown")}>
              <textarea
                name="content_markdown"
                defaultValue={article?.content_markdown ?? ""}
                className={textareaClassName("min-h-[28rem] font-mono text-xs")}
                required
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("admin.articles.form.tags")}>
              <SearchableMultiSelect
                name="tag_ids"
                options={tags.map((tag) => ({ value: tag.id, label: tag.label }))}
                defaultValue={initialValue?.tagIds ?? []}
                placeholder={t("admin.articles.form.searchTags")}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("admin.articles.form.relatedWords")}>
              <SearchableMultiSelect
                name="related_word_ids"
                options={words.map((word) => ({ value: word.id, label: word.label }))}
                defaultValue={initialValue?.relatedWordIds ?? []}
                placeholder={t("admin.articles.form.searchWords")}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("admin.articles.form.relatedGrammarPoints")}>
              <SearchableMultiSelect
                name="related_grammar_point_ids"
                options={grammarPoints.map((point) => ({ value: point.id, label: point.label }))}
                defaultValue={initialValue?.relatedGrammarPointIds ?? []}
                placeholder={t("admin.articles.form.searchGrammar")}
              />
            </Field>
          </div>
          <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={article?.is_published ?? false}
            />
            <span className="text-sm font-medium text-foreground">{t("admin.articles.form.published")}</span>
          </label>
        </div>

        <AdminSubmitRow
          submitLabel={submitLabel}
          secondaryAction={
            <Link href={link("/admin/articles")} className={buttonVariants({ variant: "outline" })}>
              {t("common.cancel")}
            </Link>
          }
        />
      </AdminFormCard>
    </form>
  );
}
