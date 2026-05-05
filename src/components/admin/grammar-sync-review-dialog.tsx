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
import { SubmitButton } from "@/components/admin/submit-button";
import { WordExamplesEditor } from "@/components/admin/word-examples-editor";
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
import type { ContentSyncFilters } from "@/features/admin/content-sync-utils";
import type { GrammarSyncRow } from "@/features/grammar-sync/types";
import { useI18n } from "@/i18n/client";

type GrammarSyncAction = (formData: FormData) => void | Promise<void>;

interface GrammarSyncReviewDialogProps {
  row: GrammarSyncRow | null;
  filters: ContentSyncFilters;
  approveAction: GrammarSyncAction;
  applyAction: GrammarSyncAction;
  rejectAction: GrammarSyncAction;
  saveAction: GrammarSyncAction;
}

function getPayload(row: GrammarSyncRow) {
  const payload = (row.adminEditedPayload ?? row.normalizedPayload ?? {}) as Record<string, unknown>;
  const examples = Array.isArray(payload.examples)
    ? payload.examples.map((example, index) => {
        const entry = example as Record<string, unknown>;
        return {
          chineseText: String(entry.chineseText ?? ""),
          pinyin: typeof entry.pinyin === "string" ? entry.pinyin : "",
          vietnameseMeaning: typeof entry.vietnameseMeaning === "string" ? entry.vietnameseMeaning : "",
          sortOrder: typeof entry.sortOrder === "number" ? entry.sortOrder : index + 1,
        };
      })
    : [];

  return {
    title: typeof payload.title === "string" ? payload.title : "",
    slug: typeof payload.slug === "string" ? payload.slug : row.sourceRowKey,
    structureText: typeof payload.structureText === "string" ? payload.structureText : "",
    explanationVi: typeof payload.explanationVi === "string" ? payload.explanationVi : "",
    notes: typeof payload.notes === "string" ? payload.notes : "",
    hskLevel: typeof payload.hskLevel === "number" ? payload.hskLevel : null,
    sourceConfidence: typeof payload.sourceConfidence === "string" ? payload.sourceConfidence : "",
    ambiguityFlag: payload.ambiguityFlag === true,
    ambiguityNote: typeof payload.ambiguityNote === "string" ? payload.ambiguityNote : "",
    reviewStatus: typeof payload.reviewStatus === "string" ? payload.reviewStatus : row.reviewStatus,
    aiStatus: typeof payload.aiStatus === "string" ? payload.aiStatus : row.aiStatus,
    examples,
  };
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

function examplesToTextarea(examples: ReturnType<typeof getPayload>["examples"]) {
  return examples
    .map((example) => [example.chineseText, example.pinyin, example.vietnameseMeaning].join(" | "))
    .join("\n");
}

function ReturnFields({ row, filters }: { row: GrammarSyncRow; filters: ContentSyncFilters }) {
  return (
    <>
      <input type="hidden" name="row_id" value={row.id} />
      {filters.batchId ? <input type="hidden" name="batch_id" value={filters.batchId} /> : null}
      <input type="hidden" name="return_view" value={filters.view} />
      <input type="hidden" name="return_q" value={filters.q} />
      <input type="hidden" name="return_change_type" value={filters.changeType} />
      <input type="hidden" name="return_review_status" value={filters.reviewStatus} />
      <input type="hidden" name="return_apply_status" value={filters.applyStatus} />
      <input type="hidden" name="return_row_id" value={row.id} />
    </>
  );
}

export function GrammarSyncReviewDialog({
  row,
  filters,
  approveAction,
  applyAction,
  rejectAction,
  saveAction,
}: GrammarSyncReviewDialogProps) {
  const { t, link } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!row) return null;

  const payload = getPayload(row);
  const isResolved =
    row.reviewStatus === "rejected" ||
    row.reviewStatus === "applied" ||
    row.applyStatus === "applied" ||
    row.applyStatus === "skipped";
  const canApprove =
    !isResolved &&
    row.reviewStatus !== "approved" &&
    row.changeClassification !== "invalid" &&
    row.changeClassification !== "conflict";
  const canReject = !isResolved && row.reviewStatus !== "rejected";
  const canApply = row.reviewStatus === "approved" && row.applyStatus !== "applied" && row.applyStatus !== "skipped";
  const canEdit = !isResolved && row.reviewStatus !== "approved";
  const issues = [...row.parseErrors, row.errorMessage].filter((value): value is string => Boolean(value));

  const closePath = () => {
    const params = new URLSearchParams();
    params.set("sync", "grammar");
    if (filters.q) params.set("q", filters.q);
    if (filters.changeType !== "all") params.set("changeType", filters.changeType);
    if (filters.reviewStatus !== "all") params.set("reviewStatus", filters.reviewStatus);
    if (filters.applyStatus !== "all") params.set("applyStatus", filters.applyStatus);
    if (filters.view !== "queue") params.set("view", filters.view);
    if (filters.batchId) params.set("batch", filters.batchId);
    return `/admin/content-sync?${params.toString()}`;
  };

  const handleClose = () => {
    router.push(link(closePath()));
  };

  const handleAction = (action: GrammarSyncAction) => {
    return (formData: FormData) => {
      startTransition(async () => {
        await action(formData);
      });
    };
  };

  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => !open && !isPending && handleClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{payload.title || row.sourceRowKey}</DialogTitle>
          <DialogDescription>
            {t("contentSync.grammar.modal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 border-b pb-4">
          <ChangeTypeBadge value={row.changeClassification} />
          <ReviewStatusBadge value={row.reviewStatus} />
          <ApplyStatusBadge value={row.applyStatus} />
          {payload.hskLevel ? <Badge variant="secondary">HSK {payload.hskLevel}</Badge> : null}
          <Badge variant="outline">{t("contentSync.detail.rowLabel", { value: row.sourceRowNumber ?? t("common.notAvailable") })}</Badge>
        </div>

        {isPending ? (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-2 text-sm font-medium text-foreground">{t("common.loading")}</p>
          </div>
        ) : null}

        <Tabs defaultValue="overview">
          <TabsList className="flex h-auto flex-wrap justify-start rounded-2xl">
            <TabsTrigger value="overview">{t("contentSync.grammar.modal.tabs.overview")}</TabsTrigger>
            <TabsTrigger value="edit">{t("contentSync.detail.tabs.edit")}</TabsTrigger>
            <TabsTrigger value="payload">{t("contentSync.grammar.modal.tabs.payload")}</TabsTrigger>
            <TabsTrigger value="issues">{t("contentSync.grammar.modal.tabs.issues")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-lg border p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{t("contentSync.grammar.detail.structure")}</p>
                <p className="mt-2 rounded-lg bg-muted p-3 text-sm font-semibold text-primary">{payload.structureText || t("common.notAvailable")}</p>
              </section>
              <section className="rounded-lg border p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{t("contentSync.grammar.detail.explanation")}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{payload.explanationVi || t("common.notAvailable")}</p>
              </section>
            </div>

            <dl className="grid gap-3 rounded-lg border p-4 text-sm md:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{t("admin.grammar.form.slug")}</dt>
                <dd>{payload.slug}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{t("admin.grammar.form.sourceConfidence")}</dt>
                <dd>{payload.sourceConfidence || t("common.notAvailable")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{t("admin.grammar.form.reviewStatus")}</dt>
                <dd>{payload.reviewStatus}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{t("admin.grammar.form.aiStatus")}</dt>
                <dd>{payload.aiStatus}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{t("admin.grammar.form.ambiguityFlag")}</dt>
                <dd>{payload.ambiguityFlag ? t("contentSync.grammar.modal.booleanYes") : t("contentSync.grammar.modal.booleanNo")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{t("admin.grammar.form.ambiguityNote")}</dt>
                <dd>{payload.ambiguityNote || t("common.notAvailable")}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs font-medium text-muted-foreground">{t("admin.grammar.form.notes")}</dt>
                <dd className="whitespace-pre-wrap">{payload.notes || t("common.notAvailable")}</dd>
              </div>
            </dl>

            <section className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{t("contentSync.grammar.modal.tabs.examples")}</p>
                <Badge variant="outline">{payload.examples.length}</Badge>
              </div>
              {payload.examples.length === 0 ? (
                <EmptyState
                  title={t("contentSync.grammar.modal.noExamplesTitle")}
                  description={t("contentSync.grammar.modal.noExamplesDescription")}
                />
              ) : (
                <div className="grid gap-3">
                  {payload.examples.map((example) => (
                    <div key={`${example.sortOrder}-${example.chineseText}`} className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline">#{example.sortOrder}</Badge>
                      </div>
                      <p className="text-lg font-semibold text-foreground">{example.chineseText}</p>
                      {example.pinyin ? <p className="mt-1 text-pinyin">{example.pinyin}</p> : null}
                      {example.vietnameseMeaning ? (
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{example.vietnameseMeaning}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="edit" className="pt-4">
            <form action={handleAction(saveAction)} className="space-y-4">
              <ReturnFields row={row} filters={filters} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("admin.grammar.form.titleLabel")}>
                  <input name="title" defaultValue={payload.title} className={inputClassName()} disabled={!canEdit || isPending} />
                </Field>
                <Field label={t("admin.grammar.form.slug")}>
                  <input name="slug" defaultValue={payload.slug} className={inputClassName()} disabled={!canEdit || isPending} />
                </Field>
                <Field label={t("admin.grammar.form.hskLevel")}>
                  <input name="hsk_level" type="number" min="1" max="9" defaultValue={payload.hskLevel ?? ""} className={inputClassName()} disabled={!canEdit || isPending} />
                </Field>
                <Field label={t("admin.grammar.form.sourceConfidence")}>
                  <select name="source_confidence" defaultValue={payload.sourceConfidence} className={inputClassName()} disabled={!canEdit || isPending}>
                    <option value="">{t("admin.grammar.form.sourceConfidenceNotSet")}</option>
                    <option value="high">{t("admin.grammar.form.sourceConfidenceHigh")}</option>
                    <option value="medium">{t("admin.grammar.form.sourceConfidenceMedium")}</option>
                    <option value="low">{t("admin.grammar.form.sourceConfidenceLow")}</option>
                  </select>
                </Field>
                <Field label={t("admin.grammar.form.reviewStatus")}>
                  <select name="review_status" defaultValue={payload.reviewStatus} className={inputClassName()} disabled={!canEdit || isPending}>
                    <option value="pending">{t("contentSync.status.review.pending")}</option>
                    <option value="needs_review">{t("contentSync.status.review.needsReview")}</option>
                    <option value="approved">{t("contentSync.status.review.approved")}</option>
                    <option value="rejected">{t("contentSync.status.review.rejected")}</option>
                    <option value="applied">{t("contentSync.status.review.applied")}</option>
                  </select>
                </Field>
                <Field label={t("admin.grammar.form.aiStatus")}>
                  <select name="ai_status" defaultValue={payload.aiStatus} className={inputClassName()} disabled={!canEdit || isPending}>
                    <option value="pending">{t("contentSync.detail.aiStatusOptions.pending")}</option>
                    <option value="processing">{t("contentSync.detail.aiStatusOptions.processing")}</option>
                    <option value="done">{t("contentSync.detail.aiStatusOptions.done")}</option>
                    <option value="failed">{t("contentSync.detail.aiStatusOptions.failed")}</option>
                    <option value="skipped">{t("contentSync.detail.aiStatusOptions.skipped")}</option>
                  </select>
                </Field>
                <label className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                  <input type="checkbox" name="ambiguity_flag" defaultChecked={payload.ambiguityFlag} disabled={!canEdit || isPending} />
                  <span className="text-sm font-medium text-foreground">{t("admin.grammar.form.ambiguityFlag")}</span>
                </label>
                <div className="md:col-span-2">
                  <Field label={t("admin.grammar.form.structureText")}>
                    <input name="structure_text" defaultValue={payload.structureText} className={inputClassName()} disabled={!canEdit || isPending} />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label={t("admin.grammar.form.vietnameseExplanation")}>
                    <textarea name="explanation_vi" defaultValue={payload.explanationVi} className={textareaClassName()} disabled={!canEdit || isPending} />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label={t("admin.grammar.form.notes")}>
                    <textarea name="notes" defaultValue={payload.notes} className={textareaClassName()} disabled={!canEdit || isPending} />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label={t("admin.grammar.form.ambiguityNote")}>
                    <textarea name="ambiguity_note" defaultValue={payload.ambiguityNote} className={textareaClassName()} disabled={!canEdit || isPending} />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label={t("admin.grammar.form.examples")} hint={t("contentSync.grammar.modal.examplesEditHint")}>
                    <WordExamplesEditor
                      name="examples_text"
                      defaultValue={examplesToTextarea(payload.examples)}
                      disabled={!canEdit || isPending}
                    />
                  </Field>
                </div>
              </div>
              {!canEdit ? (
                <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                  {t("contentSync.grammar.modal.editLocked")}
                </p>
              ) : null}
              <div className="flex justify-end">
                <SubmitButton variant="outline" disabled={!canEdit || isPending}>
                  {t("contentSync.detail.actions.saveChangesOnly")}
                </SubmitButton>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="payload" className="grid gap-4 pt-4 lg:grid-cols-2">
            <section className="space-y-2">
              <p className="text-sm font-semibold">{t("contentSync.detail.payloads.raw")}</p>
              <pre className="max-h-[420px] overflow-auto rounded-lg border bg-muted p-3 text-xs">
                {formatJson(row.rawPayload)}
              </pre>
            </section>
            <section className="space-y-2">
              <p className="text-sm font-semibold">{t("contentSync.detail.payloads.normalized")}</p>
              <pre className="max-h-[420px] overflow-auto rounded-lg border bg-muted p-3 text-xs">
                {formatJson(row.adminEditedPayload ?? row.normalizedPayload)}
              </pre>
            </section>
          </TabsContent>

          <TabsContent value="issues" className="space-y-4 pt-4">
            {issues.length === 0 ? (
              <EmptyState
                title={t("contentSync.empty.noIssues")}
                description={t("contentSync.empty.noIssuesDescription")}
              />
            ) : (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-semibold text-destructive">{t("contentSync.error.syncError")}</p>
                <ul className="mt-2 grid gap-1 text-sm text-destructive/90">
                  {issues.map((issue, index) => (
                    <li key={`${issue}-${index}`}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            {row.diffSummary ? (
              <section className="space-y-2">
                <p className="text-sm font-semibold">{t("contentSync.detail.tabs.diff")}</p>
                <pre className="max-h-[320px] overflow-auto rounded-lg border bg-muted p-3 text-xs">
                  {formatJson(row.diffSummary)}
                </pre>
              </section>
            ) : null}
          </TabsContent>
        </Tabs>

        <DialogFooter className="items-center border-t pt-4 sm:justify-between">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isPending}>
            {t("contentSync.detail.actions.close")}
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            {canReject ? (
              <form action={handleAction(rejectAction)}>
                <ReturnFields row={row} filters={filters} />
                <SubmitButton variant="outline" disabled={isPending}>
                  {t("contentSync.detail.actions.rejectRow")}
                </SubmitButton>
              </form>
            ) : null}
            {canApprove ? (
              <form action={handleAction(approveAction)}>
                <ReturnFields row={row} filters={filters} />
                <SubmitButton disabled={isPending}>
                  {t("contentSync.status.review.approved")}
                </SubmitButton>
              </form>
            ) : null}
            {canApply ? (
              <form action={handleAction(applyAction)}>
                <ReturnFields row={row} filters={filters} />
                <SubmitButton disabled={isPending}>
                  {t("contentSync.detail.actions.applyNow")}
                </SubmitButton>
              </form>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
