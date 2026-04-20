"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircleOff, GitCompare, Sparkles, FileWarning, X, Plus, Trash2 } from "lucide-react";

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
import {
  ALLOWED_TOPIC_TAGS,
  CHARACTER_STRUCTURE_LIST,
  PART_OF_SPEECH_LIST,
  TAG_LABELS,
} from "@/features/vocabulary-sync/constants";
import type { VocabSyncRow } from "@/features/vocabulary-sync/types";
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
  rejectAction: any;
  radicals: RadicalListItem[];
}

export function ContentSyncDetailDialog({
  row,
  batchId,
  filters,
  saveAction,
  approveAction,
  rejectAction,
  radicals,
}: ContentSyncDetailDialogProps) {
  const { t, link } = useI18n();
  const router = useRouter();

  const formValue = getEditablePayloadForForm(row || ({} as any));
  const [examples, setExamples] = useState(formValue.examples);
  const isResolved =
    row?.reviewStatus === "approved" ||
    row?.reviewStatus === "rejected" ||
    row?.reviewStatus === "applied" ||
    row?.applyStatus === "applied" ||
    row?.applyStatus === "skipped";

  useEffect(() => {
    if (row) {
      setExamples(formValue.examples);
    }
  }, [row?.id]);

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

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Review row detail</DialogTitle>
          </div>
          <DialogDescription>
            Inspect staged content and review the normalized payload for this sync row.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3 py-4 border-b">
          <ChangeTypeBadge value={row.changeClassification} />
          <ReviewStatusBadge value={row.reviewStatus} />
          <ApplyStatusBadge value={row.applyStatus} />
          <Badge variant="outline">Row #{row.sourceRowNumber ?? t("common.notAvailable")}</Badge>
          <Badge variant="outline">Match: {row.matchResult ?? t("common.notAvailable")}</Badge>
        </div>

        {row.errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">Sync error</p>
            <p className="mt-1 text-sm text-destructive/90">{row.errorMessage}</p>
          </div>
        ) : null}

        <Tabs defaultValue="edit" className="mt-4">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="diff">Diff</TabsTrigger>
            <TabsTrigger value="payloads">Payloads</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-6 pt-4">
            <form action={saveAction} className="space-y-6">
              <input type="hidden" name="row_id" value={row.id} />
              <input type="hidden" name="batch_id" value={batchId} />
              <input type="hidden" name="return_view" value={filters.view} />
              <input type="hidden" name="return_q" value={filters.q} />
              <input type="hidden" name="return_change_type" value={filters.changeType} />
              <input type="hidden" name="return_review_status" value={filters.reviewStatus} />
              <input type="hidden" name="return_apply_status" value={filters.applyStatus} />
              <input type="hidden" name="return_row_id" value={row.id} />

              <fieldset disabled={isResolved} className="grid gap-4 md:grid-cols-2">
                <Field label="Normalized text">
                  <input name="normalized_text" defaultValue={formValue.normalizedText} className={inputClassName()} />
                </Field>
                <Field label="Pinyin">
                  <input name="pinyin" defaultValue={formValue.pinyin} className={inputClassName()} />
                </Field>
                <Field label="Vietnamese meaning">
                  <input name="meanings_vi" defaultValue={formValue.meaningsVi} className={inputClassName()} />
                </Field>
                <Field label="Han-Viet">
                  <input name="han_viet" defaultValue={formValue.hanViet} className={inputClassName()} />
                </Field>
                <Field label="Traditional variant">
                  <input name="traditional_variant" defaultValue={formValue.traditionalVariant} className={inputClassName()} />
                </Field>
                <Field label="HSK level">
                  <input name="hsk_level" defaultValue={formValue.hskLevel} className={inputClassName()} inputMode="numeric" />
                </Field>
                <Field label="Main radicals">
                  <SearchableMultiSelect
                    name="main_radicals"
                    options={radicals.map((r) => ({
                      value: r.radical,
                      label: `${r.radical} (${r.han_viet_name || r.meaning_vi})`,
                    }))}
                    defaultValue={formValue.mainRadicals}
                  />
                </Field>
                <Field label="Topic tags" hint="Search and select from predefined categories">
                  <SearchableMultiSelect
                    name="topic_tags"
                    options={ALLOWED_TOPIC_TAGS}
                    defaultValue={formValue.topicTags}
                    labelMapping={TAG_LABELS}
                  />
                </Field>
                <Field label="Part of speech">
                  <SearchableMultiSelect
                    name="part_of_speech"
                    options={PART_OF_SPEECH_LIST}
                    defaultValue={formValue.partOfSpeech}
                    labelMapping={TAG_LABELS}
                    isMulti={true}
                  />
                </Field>
                <Field label="Character structure type">
                  <SearchableMultiSelect
                    name="character_structure_type"
                    options={CHARACTER_STRUCTURE_LIST}
                    defaultValue={formValue.characterStructureType}
                    labelMapping={TAG_LABELS}
                    isMulti={false}
                  />
                </Field>
                <Field label="AI status">
                  <select name="ai_status" defaultValue={formValue.aiStatus} className={inputClassName()}>
                    <option value="pending">pending</option>
                    <option value="processing">processing</option>
                    <option value="done">done</option>
                    <option value="failed">failed</option>
                    <option value="skipped">skipped</option>
                  </select>
                </Field>
                <Field label="Source updated at">
                  <input name="source_updated_at" defaultValue={formValue.sourceUpdatedAt} className={inputClassName()} readOnly disabled />
                </Field>
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Examples</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExamples([...examples, { chineseText: "", pinyin: "", vietnameseMeaning: "", sortOrder: examples.length + 1 }])}
                      className="h-8 gap-1 rounded-full px-3"
                    >
                      <Plus className="size-3" />
                      Add Example
                    </Button>
                  </div>
                  <div className="grid gap-4">
                    {examples.map((ex, i) => (
                      <div key={i} className="group relative grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 rounded-2xl border bg-muted/20 p-4 transition-all hover:bg-muted/30">
                        <input
                          name={`example_zh_${i}`}
                          placeholder="Chinese text"
                          defaultValue={ex.chineseText}
                          className={inputClassName("h-9 rounded-xl")}
                        />
                        <input
                          name={`example_py_${i}`}
                          placeholder="Pinyin"
                          defaultValue={ex.pinyin ?? ""}
                          className={inputClassName("h-9 rounded-xl")}
                        />
                        <input
                          name={`example_vi_${i}`}
                          placeholder="Vietnamese meaning"
                          defaultValue={ex.vietnameseMeaning}
                          className={inputClassName("h-9 rounded-xl")}
                        />
                        <button
                          type="button"
                          onClick={() => setExamples(examples.filter((_, idx) => idx !== i))}
                          className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                    {examples.length === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground border-2 border-dashed rounded-2xl">
                        No examples added. Click "Add Example" to create one.
                      </p>
                    )}
                  </div>
                </div>
                <Field label="Structure explanation">
                  <textarea name="structure_explanation" defaultValue={formValue.structureExplanation} className={textareaClassName("min-h-24")} />
                </Field>
                <Field label="Mnemonic">
                  <textarea name="mnemonic" defaultValue={formValue.mnemonic} className={textareaClassName("min-h-24")} />
                </Field>
                <Field label="Similar chars" hint="Pipe-delimited">
                  <input name="similar_chars" defaultValue={formValue.similarChars} className={inputClassName()} />
                </Field>
                <Field label="Reading candidates">
                  <textarea name="reading_candidates" defaultValue={formValue.readingCandidates} className={textareaClassName("min-h-24")} />
                </Field>
                <Field label="Ambiguity note">
                  <textarea name="ambiguity_note" defaultValue={formValue.ambiguityNote} className={textareaClassName("min-h-24")} />
                </Field>
                <Field label="Review note">
                  <textarea name="review_note" defaultValue={formValue.reviewNote} className={textareaClassName("min-h-24")} />
                </Field>
                <Field label="Notes">
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
                      <p className="text-sm font-bold text-amber-900">Mark as ambiguous</p>
                      <p className="text-xs text-amber-700">Requires manual review due to complex or multiple valid readings.</p>
                    </div>
                  </label>
                </div>
              </fieldset>

              <div className="space-y-4 pt-6 border-t">
                {isResolved ? (
                  <div className="rounded-xl border border-dashed bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">
                      This row has already been resolved. It is view-only and no further actions are available.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        formAction={approveAction}
                        className="bg-success hover:bg-success/90"
                      >
                        Approve and sync
                      </Button>
                      <Button
                        type="submit"
                        formAction={rejectAction}
                        variant="destructive"
                      >
                        Reject row
                      </Button>
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" variant="secondary">Save changes only</Button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </TabsContent>

          <TabsContent value="diff" className="pt-4">
            <pre className="overflow-x-auto rounded-xl border bg-muted/30 p-4 text-xs">
              {JSON.stringify(row.diffSummary ?? { message: "No diff available." }, null, 2)}
            </pre>
          </TabsContent>

          <TabsContent value="payloads" className="pt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">Raw from Sheet</p>
                <pre className="overflow-x-auto rounded-xl border bg-muted/30 p-4 text-xs">
                  {JSON.stringify(row.rawPayload, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">Current Normalized</p>
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
                  <CardTitle className="text-sm text-destructive">Apply error</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-destructive/90">
                  {row.errorMessage}
                </CardContent>
              </Card>
            ) : null}
            {row.changeClassification === "conflict" && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-sm text-amber-800">Conflict guidance</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-amber-700">
                  {typeof row.diffSummary?.guidance === "string" 
                    ? row.diffSummary.guidance 
                    : "Multiple production matches found. Please disambiguate."}
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
            ) : (
              <EmptyState title="No issues" description="Normalization successful." />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
