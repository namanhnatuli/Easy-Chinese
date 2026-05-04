"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  ApplyStatusBadge,
  ChangeTypeBadge,
  ReviewStatusBadge,
} from "@/components/admin/content-sync-status-badge";
import { Field, inputClassName, textareaClassName } from "@/components/admin/form-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableMultiSelect } from "@/components/admin/searchable-multi-select";
import { WordSensesEditor } from "@/components/admin/word-senses-editor";
import {
  ALLOWED_TOPIC_TAGS,
  CHARACTER_STRUCTURE_LIST,
  TAG_LABELS,
} from "@/features/vocabulary-sync/constants";
import type { VocabSyncRow } from "@/features/vocabulary-sync/types";
import type { AdminWordSenseDraft } from "@/features/admin/word-senses";
import type { ContentSyncFilters } from "@/features/admin/content-sync-utils";
import { getEditablePayloadForForm } from "@/features/admin/content-sync-utils";
import { useI18n } from "@/i18n/client";
import { checkboxClassName } from "@/components/admin/form-primitives";
import type { RadicalListItem } from "@/features/admin/radicals";

interface ContentSyncDetailDialogProps {
  row: VocabSyncRow | null;
  batchId: string;
  filters: ContentSyncFilters;
  saveAction: any;
  approveAction: any;
  applyAction: any;
  rejectAction: any;
  radicals: RadicalListItem[];
}

export function ContentSyncDetailDialog({
  row,
  batchId,
  filters,
  saveAction,
  approveAction,
  applyAction,
  rejectAction,
  radicals,
}: ContentSyncDetailDialogProps) {
  const { t, link } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const formValue = getEditablePayloadForForm(row || ({} as any));
  const sourceModeLabel = formValue.senseSourceMode === "senses_json" ? "senses_json source of truth" : "legacy fallback mode";
  const editorSenses: AdminWordSenseDraft[] =
    formValue.senses.length > 0
      ? formValue.senses.map((sense) => ({
          id: null,
          pinyin: sense.pinyin,
          partOfSpeech: sense.partOfSpeech,
          meaningVi: sense.meaningVi,
          usageNote: sense.usageNote,
          senseOrder: sense.senseOrder,
          isPrimary: sense.isPrimary,
          isPublished: true,
          examples: sense.examples.map((example) => ({
            chineseText: example.cn,
            pinyin: example.py ?? "",
            vietnameseMeaning: example.vi,
          })),
        }))
      : [
          {
            id: null,
            pinyin: formValue.pinyin,
            partOfSpeech: formValue.partOfSpeech || null,
            meaningVi: formValue.meaningsVi,
            usageNote: formValue.notes || null,
            senseOrder: 1,
            isPrimary: true,
            isPublished: true,
            examples: formValue.examples.map((example) => ({
              chineseText: example.chineseText,
              pinyin: example.pinyin ?? "",
              vietnameseMeaning: example.vietnameseMeaning,
            })),
          },
        ];
  const senseIssues = [
    ...formValue.validationWarnings,
    ...formValue.senses.flatMap((sense, index) => [
      ...(sense.validationWarnings ?? []).map((warning) => `Sense ${index + 1}: ${warning}`),
      ...(sense.examples.length === 0 ? [`Sense ${index + 1}: missing examples.`] : []),
      ...(!sense.partOfSpeech ? [`Sense ${index + 1}: missing part_of_speech.`] : []),
    ]),
  ];
  const isResolved =
    row?.reviewStatus === "rejected" ||
    row?.reviewStatus === "applied" ||
    row?.applyStatus === "applied" ||
    row?.applyStatus === "skipped";
  const isApprovedPendingApply =
    row?.reviewStatus === "approved" && row?.applyStatus === "pending";
  const isEditLocked = isResolved || isApprovedPendingApply;

  if (!row) return null;

  const handleClose = () => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.changeType !== "all") params.set("changeType", filters.changeType);
    if (filters.reviewStatus !== "all") params.set("reviewStatus", filters.reviewStatus);
    if (filters.applyStatus !== "all") params.set("applyStatus", filters.applyStatus);
    if (filters.view !== "queue") params.set("view", filters.view);
    if (batchId) params.set("batch", batchId);
    
    router.push(link(`/admin/content-sync?${params.toString()}`));
  };

  const handleAction = (actionFn: any) => {
    return (formData: FormData) => {
      startTransition(async () => {
        await actionFn(formData);
      });
    };
  };

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && !isPending && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{t("contentSync.detail.title")}</DialogTitle>
          </div>
          <DialogDescription>
            {t("contentSync.detail.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3 py-4 border-b">
          <ChangeTypeBadge value={row.changeClassification} />
          <ReviewStatusBadge value={row.reviewStatus} />
          <ApplyStatusBadge value={row.applyStatus} />
          <Badge variant="outline">{t("contentSync.detail.rowLabel", { value: row.sourceRowNumber ?? t("common.notAvailable") })}</Badge>
          <Badge variant="outline">{t("contentSync.detail.matchLabel", { value: row.matchResult ?? t("common.notAvailable") })}</Badge>
        </div>

        {row.errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">{t("contentSync.error.syncError")}</p>
            <p className="mt-1 text-sm text-destructive/90">{row.errorMessage}</p>
          </div>
        ) : null}

        <Tabs defaultValue="review" className="mt-4">
          <TabsList>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="edit">{t("contentSync.detail.tabs.edit")}</TabsTrigger>
            <TabsTrigger value="diff">{t("contentSync.detail.tabs.diff")}</TabsTrigger>
            <TabsTrigger value="payloads">{t("contentSync.detail.tabs.payloads")}</TabsTrigger>
            <TabsTrigger value="issues">{t("contentSync.detail.tabs.issues")}</TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="space-y-5 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">Word summary</p>
                  <Badge variant={formValue.senseSourceMode === "senses_json" ? "default" : "secondary"}>
                    {sourceModeLabel}
                  </Badge>
                </div>
                <dl className="grid gap-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Input text</dt><dd>{typeof row.rawPayload.input_text === "string" && row.rawPayload.input_text ? row.rawPayload.input_text : formValue.normalizedText}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Normalized text</dt><dd>{formValue.normalizedText || t("common.notAvailable")}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">HSK level</dt><dd>{formValue.hskLevel || t("common.notAvailable")}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Main radicals</dt><dd>{formValue.mainRadicals || t("common.notAvailable")}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Radical summary</dt><dd>{formValue.radicalSummary || t("common.notAvailable")}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Source confidence</dt><dd>{formValue.sourceConfidence || t("common.notAvailable")}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Ambiguity</dt><dd>{formValue.ambiguityFlag ? "Yes" : "No"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Ambiguity note</dt><dd>{formValue.ambiguityNote || t("common.notAvailable")}</dd></div>
                </dl>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">Derived legacy summary</p>
                <dl className="grid gap-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Pinyin summary</dt><dd>{formValue.pinyin || t("common.notAvailable")}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Meanings summary</dt><dd>{formValue.meaningsVi || t("common.notAvailable")}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Part of speech summary</dt><dd>{formValue.partOfSpeech || t("common.notAvailable")}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Reading candidates</dt><dd className="whitespace-pre-wrap">{formValue.readingCandidates || t("common.notAvailable")}</dd></div>
                </dl>
              </div>
            </div>

            {senseIssues.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Issues to review</p>
                <ul className="mt-2 grid gap-1 text-xs text-amber-800">
                  {senseIssues.map((issue, index) => (
                    <li key={`${issue}-${index}`}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Senses</p>
                <Badge variant="outline">{formValue.senses.length} total</Badge>
              </div>
              {formValue.senses.length > 0 ? (
                <div className="grid gap-3">
                  {formValue.senses.map((sense, senseIndex) => (
                    <div key={`${sense.pinyin}-${sense.senseOrder}-${senseIndex}`} className="rounded-lg border bg-background p-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge variant={sense.isPrimary ? "default" : "outline"}>{sense.isPrimary ? "Primary" : `Sense ${senseIndex + 1}`}</Badge>
                        <Badge variant="secondary">Order {sense.senseOrder}</Badge>
                        {sense.partOfSpeech ? <Badge variant="outline">{TAG_LABELS[sense.partOfSpeech] ?? sense.partOfSpeech}</Badge> : <Badge variant="destructive">Invalid POS</Badge>}
                      </div>
                      <dl className="grid gap-2 text-sm md:grid-cols-2">
                        <div><dt className="text-xs text-muted-foreground">Pinyin</dt><dd>{sense.pinyin}</dd></div>
                        <div><dt className="text-xs text-muted-foreground">Meaning VI</dt><dd>{sense.meaningVi}</dd></div>
                        <div className="md:col-span-2"><dt className="text-xs text-muted-foreground">Usage note</dt><dd>{sense.usageNote || t("common.notAvailable")}</dd></div>
                      </dl>
                      {sense.validationWarnings && sense.validationWarnings.length > 0 ? (
                        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                          {sense.validationWarnings.join(" ")}
                        </div>
                      ) : null}
                      <div className="mt-4 grid gap-2">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Examples</p>
                        {sense.examples.length > 0 ? (
                          sense.examples.map((example, exampleIndex) => (
                            <div key={`${example.cn}-${exampleIndex}`} className="rounded-md border bg-muted/20 p-3 text-sm">
                              <p className="font-medium text-foreground">{example.cn}</p>
                              <p className="text-muted-foreground">{example.py || t("common.notAvailable")}</p>
                              <p>{example.vi}</p>
                            </div>
                          ))
                        ) : (
                          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">No examples attached to this sense.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No senses found" description="This row is using legacy word-level data or has invalid sense data." />
              )}
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">Approval decision</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use Approve and sync to publish approved words and senses immediately, Reject row to close it, or Save changes only to keep it in review.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="space-y-6 pt-4 relative">
            {isPending && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-[2px] rounded-2xl">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="mt-2 text-sm font-medium text-foreground">Processing...</p>
              </div>
            )}
            <form action={handleAction(saveAction)} className="space-y-6">
              <input type="hidden" name="row_id" value={row.id} />
              <input type="hidden" name="batch_id" value={batchId} />
              <input type="hidden" name="return_view" value={filters.view} />
              <input type="hidden" name="return_q" value={filters.q} />
              <input type="hidden" name="return_change_type" value={filters.changeType} />
              <input type="hidden" name="return_review_status" value={filters.reviewStatus} />
              <input type="hidden" name="return_apply_status" value={filters.applyStatus} />
              <input type="hidden" name="return_page" value={filters.page} />
              <input type="hidden" name="return_page_size" value={filters.pageSize} />
              <input type="hidden" name="return_row_id" value={row.id} />

              <fieldset disabled={isEditLocked} className="grid gap-4 md:grid-cols-2">
                <Field label={t("contentSync.detail.fields.normalizedText")}>
                  <input name="normalized_text" defaultValue={formValue.normalizedText} className={inputClassName()} />
                </Field>
                <Field label={t("contentSync.detail.fields.hanViet")}>
                  <input name="han_viet" defaultValue={formValue.hanViet} className={inputClassName()} />
                </Field>
                <Field label={t("contentSync.detail.fields.traditionalVariant")}>
                  <input name="traditional_variant" defaultValue={formValue.traditionalVariant} className={inputClassName()} />
                </Field>
                <Field label={t("contentSync.detail.fields.hskLevel")}>
                  <input name="hsk_level" defaultValue={formValue.hskLevel} className={inputClassName()} inputMode="numeric" />
                </Field>
                <Field label={t("contentSync.detail.fields.mainRadicals")}>
                  <SearchableMultiSelect
                    name="main_radicals"
                    options={radicals.map((r) => ({
                      value: r.radical,
                      label: `${r.radical} (${r.han_viet_name || r.meaning_vi})`,
                    }))}
                    defaultValue={formValue.mainRadicals}
                  />
                </Field>
                <Field label={t("contentSync.detail.fields.topicTags")} hint={t("contentSync.detail.fields.topicTagsHint")}>
                  <SearchableMultiSelect
                    name="topic_tags"
                    options={ALLOWED_TOPIC_TAGS}
                    defaultValue={formValue.topicTags}
                    labelMapping={TAG_LABELS}
                  />
                </Field>
                <Field label={t("contentSync.detail.fields.characterStructureType")}>
                  <SearchableMultiSelect
                    name="character_structure_type"
                    options={CHARACTER_STRUCTURE_LIST}
                    defaultValue={formValue.characterStructureType}
                    labelMapping={TAG_LABELS}
                    isMulti={false}
                  />
                </Field>
                <Field label={t("contentSync.detail.fields.aiStatus")}>
                  <select name="ai_status" defaultValue={formValue.aiStatus} className={inputClassName()}>
                    <option value="pending">{t("contentSync.detail.aiStatusOptions.pending")}</option>
                    <option value="processing">{t("contentSync.detail.aiStatusOptions.processing")}</option>
                    <option value="done">{t("contentSync.detail.aiStatusOptions.done")}</option>
                    <option value="failed">{t("contentSync.detail.aiStatusOptions.failed")}</option>
                    <option value="skipped">{t("contentSync.detail.aiStatusOptions.skipped")}</option>
                  </select>
                </Field>
                <Field label={t("contentSync.detail.fields.sourceUpdatedAt")}>
                  <input name="source_updated_at" defaultValue={formValue.sourceUpdatedAt} className={inputClassName()} readOnly disabled />
                </Field>
                <div className="md:col-span-2">
                  <div className="mb-3 rounded-lg border bg-muted/20 p-4">
                    <p className="text-sm font-semibold text-foreground">Sense-level edit</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Edit pinyin, part of speech, Vietnamese meaning, notes, and examples inside each sense. Word-level summaries are derived when saved.
                    </p>
                  </div>
                  <WordSensesEditor
                    key={row.id}
                    name="senses_json"
                    defaultValue={editorSenses}
                    ambiguityFlag={formValue.ambiguityFlag}
                    sourceConfidence={formValue.sourceConfidence || null}
                    readingCandidates={formValue.readingCandidates || null}
                  />
                </div>
                <Field label={t("contentSync.detail.fields.structureExplanation")}>
                  <textarea name="structure_explanation" defaultValue={formValue.structureExplanation} className={textareaClassName("min-h-24")} />
                </Field>
                <Field label={t("contentSync.detail.fields.mnemonic")}>
                  <textarea name="mnemonic" defaultValue={formValue.mnemonic} className={textareaClassName("min-h-24")} />
                </Field>
                <Field label={t("contentSync.detail.fields.similarChars")} hint={t("contentSync.detail.fields.similarCharsHint")}>
                  <input name="similar_chars" defaultValue={formValue.similarChars} className={inputClassName()} />
                </Field>
                <Field label={t("contentSync.detail.fields.ambiguityNote")}>
                  <textarea name="ambiguity_note" defaultValue={formValue.ambiguityNote} className={textareaClassName("min-h-24")} />
                </Field>
                <Field label={t("contentSync.detail.fields.reviewNote")}>
                  <textarea name="review_note" defaultValue={formValue.reviewNote} className={textareaClassName("min-h-24")} />
                </Field>
                <Field label={t("contentSync.detail.fields.notes")}>
                  <textarea name="notes" defaultValue={formValue.notes} className={textareaClassName("min-h-24")} />
                </Field>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-4 transition-all hover:bg-amber-50 cursor-pointer">
                    <input
                      type="checkbox"
                      name="ambiguity_flag"
                      defaultChecked={formValue.ambiguityFlag}
                      className={checkboxClassName("size-5 border-amber-400 text-amber-600")}
                    />
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-amber-900">{t("contentSync.detail.ambiguity.label")}</p>
                      <p className="text-xs text-amber-700">{t("contentSync.detail.ambiguity.description")}</p>
                    </div>
                  </label>
                </div>
              </fieldset>

              <div className="space-y-4 pt-6 border-t">
                {isResolved ? (
                  <div className="rounded-xl border border-dashed bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">
                      {t("contentSync.detail.resolvedNotice")}
                    </p>
                  </div>
                ) : isApprovedPendingApply ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="rounded-xl border border-dashed bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">
                        {t("contentSync.detail.pendingApplyNotice")}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        formAction={handleAction(applyAction)}
                        className="bg-success hover:bg-success/90"
                        disabled={isPending}
                      >
                        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        {t("contentSync.detail.actions.applyNow")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        formAction={handleAction(approveAction)}
                        className="bg-success hover:bg-success/90"
                        disabled={isPending}
                      >
                        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        {t("contentSync.detail.actions.approveAndSync")}
                      </Button>
                      <Button
                        type="submit"
                        formAction={handleAction(rejectAction)}
                        variant="destructive"
                        disabled={isPending}
                      >
                        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        {t("contentSync.detail.actions.rejectRow")}
                      </Button>
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" variant="secondary" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        {t("contentSync.detail.actions.saveChangesOnly")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </TabsContent>

          <TabsContent value="diff" className="pt-4">
            <pre className="overflow-x-auto rounded-xl border bg-muted/30 p-4 text-xs">
              {JSON.stringify(row.diffSummary ?? { message: t("contentSync.empty.noDiff") }, null, 2)}
            </pre>
          </TabsContent>

          <TabsContent value="payloads" className="pt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">{t("contentSync.detail.payloads.raw")}</p>
                <pre className="overflow-x-auto rounded-xl border bg-muted/30 p-4 text-xs">
                  {JSON.stringify(row.rawPayload, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">{t("contentSync.detail.payloads.normalized")}</p>
                <pre className="overflow-x-auto rounded-xl border bg-muted/30 p-4 text-xs">
                  {JSON.stringify(row.adminEditedPayload ?? row.normalizedPayload, null, 2)}
                </pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="issues" className="pt-4">
            {row.errorMessage ? (
              <Card className="mb-4 border-destructive/30 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-sm text-destructive">{t("contentSync.error.applyError")}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-destructive/90">
                  {row.errorMessage}
                </CardContent>
              </Card>
            ) : null}
            {row.changeClassification === "conflict" && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-sm text-amber-800">{t("contentSync.detail.conflictGuidance")}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-amber-700">
                  {typeof row.diffSummary?.guidance === "string" 
                    ? row.diffSummary.guidance 
                    : t("contentSync.detail.conflictFallback")}
                </CardContent>
              </Card>
            )}
            {row.parseErrors.length > 0 ? (
              <div className="space-y-2">
                {row.parseErrors.map((err, i) => (
                  <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    {err}
                  </div>
                ))}
              </div>
            ) : senseIssues.length > 0 ? (
              <div className="space-y-2">
                {senseIssues.map((warning, i) => (
                  <div key={`${warning}-${i}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    {warning}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={t("contentSync.empty.noIssues")} description={t("contentSync.empty.noIssuesDescription")} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
