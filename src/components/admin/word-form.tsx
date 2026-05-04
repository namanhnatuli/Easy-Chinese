import Link from "next/link";

import { AdminFormCard, AdminSubmitRow, Field, inputClassName, textareaClassName } from "@/components/admin/form-primitives";
import { SearchableMultiSelect } from "@/components/admin/searchable-multi-select";
import { WordSensesEditor } from "@/components/admin/word-senses-editor";
import { buttonVariants } from "@/components/ui/button";
import type { AdminSelectOption, AdminWordEditor } from "@/features/admin/words";
import {
  ALLOWED_TOPIC_TAGS,
  CHARACTER_STRUCTURE_LIST,
  TAG_LABELS,
} from "@/features/vocabulary-sync/constants";
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
        description="Edit shared word metadata here. Reading-specific meanings, examples, and publish state live in the sense editor below."
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
          <Field label={t("contentSync.detail.fields.normalizedText")}>
            <input
              name="normalized_text"
              defaultValue={word?.normalized_text ?? word?.simplified ?? ""}
              className={inputClassName()}
            />
          </Field>
          <Field label={t("contentSync.detail.fields.traditionalVariant")}>
            <input
              name="traditional_variant"
              defaultValue={word?.traditional_variant ?? word?.traditional ?? ""}
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
          <Field label={t("contentSync.detail.fields.topicTags")}>
            <SearchableMultiSelect
              name="topic_tags"
              options={ALLOWED_TOPIC_TAGS}
              defaultValue={word?.topic_tags ?? []}
              labelMapping={TAG_LABELS}
            />
          </Field>
          <Field label={t("contentSync.detail.fields.characterStructureType")}>
            <SearchableMultiSelect
              name="character_structure_type"
              options={CHARACTER_STRUCTURE_LIST}
              defaultValue={word?.character_structure_type ?? ""}
              labelMapping={TAG_LABELS}
              isMulti={false}
            />
          </Field>
          <Field label={t("contentSync.detail.fields.aiStatus")}>
            <select name="ai_status" defaultValue={word?.ai_status ?? "done"} className={inputClassName()}>
              <option value="pending">{t("contentSync.detail.aiStatusOptions.pending")}</option>
              <option value="processing">{t("contentSync.detail.aiStatusOptions.processing")}</option>
              <option value="done">{t("contentSync.detail.aiStatusOptions.done")}</option>
              <option value="failed">{t("contentSync.detail.aiStatusOptions.failed")}</option>
              <option value="skipped">{t("contentSync.detail.aiStatusOptions.skipped")}</option>
            </select>
          </Field>
          <Field label={t("admin.words.form.sourceConfidence")}>
            <select name="source_confidence" defaultValue={word?.source_confidence ?? ""} className={inputClassName()}>
              <option value="">{t("common.notAvailable")}</option>
              <option value="low">{t("admin.words.form.sourceConfidenceOptions.low")}</option>
              <option value="medium">{t("admin.words.form.sourceConfidenceOptions.medium")}</option>
              <option value="high">{t("admin.words.form.sourceConfidenceOptions.high")}</option>
            </select>
          </Field>
          <Field label="Review status">
            <select name="review_status" defaultValue={word?.review_status ?? "approved"} className={inputClassName()}>
              <option value="pending">{t("contentSync.status.review.pending")}</option>
              <option value="needs_review">{t("contentSync.status.review.needsReview")}</option>
              <option value="approved">{t("contentSync.status.review.approved")}</option>
              <option value="rejected">{t("contentSync.status.review.rejected")}</option>
              <option value="applied">{t("contentSync.status.review.applied")}</option>
            </select>
          </Field>
          <Field label={t("contentSync.detail.fields.radicalSummary")}>
            <textarea
              name="radical_summary"
              defaultValue={word?.radical_summary ?? ""}
              className={textareaClassName("min-h-24")}
            />
          </Field>
          <Field label={t("contentSync.detail.fields.structureExplanation")}>
            <textarea
              name="structure_explanation"
              defaultValue={word?.structure_explanation ?? ""}
              className={textareaClassName("min-h-24")}
            />
          </Field>
          <Field label={t("contentSync.detail.fields.mnemonic")}>
            <textarea
              name="mnemonic"
              defaultValue={word?.mnemonic ?? ""}
              className={textareaClassName("min-h-24")}
            />
          </Field>
          <Field label={t("admin.words.form.componentBreakdownJson")}>
            <textarea
              name="component_breakdown_json"
              defaultValue={
                word?.component_breakdown_json
                  ? JSON.stringify(word.component_breakdown_json, null, 2)
                  : ""
              }
              className={textareaClassName("min-h-24 font-mono text-xs")}
            />
          </Field>
          <Field label={t("contentSync.detail.fields.ambiguityNote")}>
            <textarea
              name="ambiguity_note"
              defaultValue={word?.ambiguity_note ?? ""}
              className={textareaClassName("min-h-24")}
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
          <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <input
              type="checkbox"
              name="ambiguity_flag"
              defaultChecked={word?.ambiguity_flag ?? false}
            />
            <span className="text-sm font-medium text-foreground">{t("admin.words.form.ambiguityFlag")}</span>
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
        </div>
      </AdminFormCard>

      <AdminFormCard
        title="Sense editor"
        description="Manage each reading or meaning separately. Saving this section will regenerate the legacy summary fields on the word record."
      >
        <WordSensesEditor
          name="senses_json"
          defaultValue={initialValue?.editableSenses ?? []}
          ambiguityFlag={word?.ambiguity_flag ?? false}
          sourceConfidence={word?.source_confidence ?? null}
          readingCandidates={word?.reading_candidates ?? null}
        />

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
