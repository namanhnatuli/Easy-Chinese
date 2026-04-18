import Link from "next/link";
import { CheckCheck, CircleOff, FileWarning, GitCompare, History, Search, Sparkles } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ContentSyncStartForm } from "@/components/admin/content-sync-start-form";
import {
  ApplyStatusBadge,
  ChangeTypeBadge,
  ReviewStatusBadge,
} from "@/components/admin/content-sync-status-badge";
import { Field, inputClassName, textareaClassName } from "@/components/admin/form-primitives";
import { FilterBar } from "@/components/shared/filter-bar";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  applyAllApprovedContentSyncRowsAction,
  applyContentSyncRowAction,
  approveAllEligibleContentSyncRowsAction,
  bulkApplyApprovedContentSyncRowsAction,
  bulkReviewContentSyncRowsAction,
  getContentSyncPageData,
  getEditablePayloadForForm,
  parseContentSyncFilters,
  retryContentSyncPreviewBatchAction,
  reviewContentSyncRowAction,
  saveContentSyncRowEditsAction,
  startContentSyncPreviewAction,
} from "@/features/admin/content-sync";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminContentSyncPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const { t, link } = await getServerI18n();
  const filters = parseContentSyncFilters(await searchParams);
  const data = await getContentSyncPageData(filters);

  const selectedRowFormValue = data.selectedRow;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Sync"
        title="Google Sheets vocabulary sync"
        description="Preview staged vocabulary rows, inspect AI-generated changes, approve them, and apply approved content safely into production words data."
        actions={
          <Button asChild variant="outline">
            <Link href={link("/admin")}>{t("common.admin")}</Link>
          </Button>
        }
      />

      <Card className="border-border/80 bg-card/95">
        <CardHeader>
          <CardTitle>Start preview sync</CardTitle>
          <CardDescription>
            Enter a spreadsheet ID and sheet name to pull rows from Google Sheets into the staged review queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContentSyncStartForm
            action={startContentSyncPreviewAction}
            labels={{
              spreadsheetId: "Spreadsheet ID",
              spreadsheetHint: "Optional when GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID is configured.",
              sheetName: "Sheet name",
              sheetHint: "Use the exact tab name from Google Sheets.",
              submit: "Start preview",
              pending: "Starting preview…",
            }}
          />
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_2.05fr]">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4" />
                Batch history
              </CardTitle>
              <CardDescription>Recent preview runs available for review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.batches.length === 0 ? (
                <EmptyState
                  title="No preview batches yet"
                  description="Start the first Google Sheets preview to create a review batch."
                />
              ) : (
                data.batches.map((batch) => {
                  const active = batch.id === data.selectedBatch?.id;
                  return (
                    <Link
                      key={batch.id}
                      href={link(`/admin/content-sync?batch=${batch.id}`)}
                      className={`block rounded-2xl border p-4 transition ${active ? "border-primary/40 bg-primary/5" : "border-border/80 bg-muted/20 hover:bg-muted/40"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {batch.sourceSheetName ?? "Unknown sheet"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {batch.sourceDocumentId ?? t("common.notAvailable")}
                          </p>
                        </div>
                        <Badge variant={batch.status === "completed" ? "success" : batch.status === "failed" ? "warning" : "secondary"}>
                          {batch.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{batch.totalRows} rows</span>
                        <span>Pending {batch.pendingRows}</span>
                        <span>Approved {batch.approvedRows}</span>
                        <span>Applied {batch.appliedRows}</span>
                        <span>Errors {batch.errorRows}</span>
                        <span>Rejected {batch.rejectedRows}</span>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          {data.selectedBatch ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <form action={retryContentSyncPreviewBatchAction}>
                  <input type="hidden" name="batch_id" value={data.selectedBatch.id} />
                  <Button type="submit" variant="outline">
                    Retry preview batch
                  </Button>
                </form>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="New" value={String(data.summary?.new ?? 0)} description="Rows with no production match yet." icon={<Sparkles className="size-4" />} />
                <StatCard label="Changed" value={String(data.summary?.changed ?? 0)} description="Matched rows where meaningful content differs." icon={<GitCompare className="size-4" />} accent="warning" />
                <StatCard label="Unchanged" value={String(data.summary?.unchanged ?? 0)} description="Rows auto-skipped because staged content already matches production." icon={<CheckCheck className="size-4" />} />
                <StatCard label="Conflict" value={String(data.summary?.conflict ?? 0)} description="Rows that still need human disambiguation." icon={<FileWarning className="size-4" />} />
                <StatCard label="Invalid" value={String(data.summary?.invalid ?? 0)} description="Rows blocked by parse or validation issues." icon={<CircleOff className="size-4" />} />
                <StatCard label="Approved" value={String(data.summary?.approved ?? 0)} description="Rows approved and still waiting for production apply." icon={<CheckCheck className="size-4" />} accent="success" />
                <StatCard label="Applied" value={String(data.summary?.applied ?? 0)} description="Rows already resolved through apply or skipped as unchanged." icon={<CheckCheck className="size-4" />} accent="success" />
                <StatCard label="Rejected" value={String(data.summary?.rejected ?? 0)} description="Rows rejected from the staged review queue." icon={<CircleOff className="size-4" />} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          {!data.selectedBatch ? (
            <EmptyState
              title="Choose a batch to review"
              description="Start a new preview or select one from the batch history to inspect staged rows."
            />
          ) : (
            <>
              <FilterBar>
                <form action={link("/admin/content-sync")} className="grid w-full gap-3 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_auto]">
                  <input type="hidden" name="batch" value={data.selectedBatch.id} />
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      name="q"
                      defaultValue={data.filters.q}
                      className={`${inputClassName("pl-10")}`}
                      placeholder="Search normalized text or pinyin"
                    />
                  </div>
                  <select name="changeType" defaultValue={data.filters.changeType} className={inputClassName()}>
                    <option value="all">All change types</option>
                    <option value="new">New</option>
                    <option value="changed">Changed</option>
                    <option value="unchanged">Unchanged</option>
                    <option value="conflict">Conflict</option>
                    <option value="invalid">Invalid</option>
                  </select>
                  <select name="reviewStatus" defaultValue={data.filters.reviewStatus} className={inputClassName()}>
                    <option value="all">All review states</option>
                    <option value="pending">Pending</option>
                    <option value="needs_review">Needs review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="applied">Applied</option>
                  </select>
                  <select name="applyStatus" defaultValue={data.filters.applyStatus} className={inputClassName()}>
                    <option value="all">All apply states</option>
                    <option value="pending">Pending apply</option>
                    <option value="applied">Applied</option>
                    <option value="failed">Failed</option>
                    <option value="skipped">Skipped</option>
                  </select>
                  <div className="flex gap-3">
                    <Button type="submit">{t("common.applyFilters")}</Button>
                    <Button asChild type="button" variant="outline">
                      <Link href={link(`/admin/content-sync?batch=${data.selectedBatch.id}`)}>{t("common.reset")}</Link>
                    </Button>
                  </div>
                </form>
              </FilterBar>

              <form action={bulkReviewContentSyncRowsAction} className="space-y-4">
                <input type="hidden" name="batch_id" value={data.selectedBatch.id} />
                <input type="hidden" name="return_q" value={data.filters.q} />
                <input type="hidden" name="return_change_type" value={data.filters.changeType} />
                <input type="hidden" name="return_review_status" value={data.filters.reviewStatus} />
                <input type="hidden" name="return_apply_status" value={data.filters.applyStatus} />
                {data.selectedRow ? <input type="hidden" name="return_row_id" value={data.selectedRow.id} /> : null}

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" name="decision" value="approve">
                    Bulk approve
                  </Button>
                  <Button type="submit" name="decision" value="reject" variant="outline">
                    Bulk reject
                  </Button>
                  <Button type="submit" formAction={bulkApplyApprovedContentSyncRowsAction} variant="secondary">
                    Apply selected approved
                  </Button>
                </div>

                {data.filteredRows.length === 0 ? (
                  <EmptyState
                    title="No staged rows match the current filters"
                    description="Adjust the search or filter settings to widen the review queue."
                  />
                ) : (
                  <section className="surface-panel overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-12">Pick</TableHead>
                          <TableHead>Text</TableHead>
                          <TableHead>Change</TableHead>
                          <TableHead>Review</TableHead>
                          <TableHead>Apply</TableHead>
                          <TableHead>Source row</TableHead>
                          <TableHead className="text-right">Open</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.filteredRows.map((row) => {
                          const payload = (row.adminEditedPayload ?? row.normalizedPayload) as Record<string, unknown>;
                          const normalizedText = typeof payload.normalizedText === "string" ? payload.normalizedText : row.sourceRowKey;
                          const pinyin = typeof payload.pinyin === "string" ? payload.pinyin : t("common.notAvailable");
                          const rowHref = link(
                            `/admin/content-sync?batch=${data.selectedBatch?.id}&q=${encodeURIComponent(data.filters.q)}${data.filters.changeType !== "all" ? `&changeType=${data.filters.changeType}` : ""}${data.filters.reviewStatus !== "all" ? `&reviewStatus=${data.filters.reviewStatus}` : ""}${data.filters.applyStatus !== "all" ? `&applyStatus=${data.filters.applyStatus}` : ""}&row=${row.id}`,
                          );

                          return (
                            <TableRow key={row.id} className={row.id === data.selectedRow?.id ? "bg-primary/5" : undefined}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  name="selected_row_ids"
                                  value={row.id}
                                  disabled={
                                    row.changeClassification === "invalid" ||
                                    row.reviewStatus === "applied" ||
                                    row.applyStatus === "applied" ||
                                    row.applyStatus === "skipped"
                                  }
                                  className="size-4 rounded border-border text-primary focus-ring"
                                />
                              </TableCell>
                              <TableCell>
                                <div className="font-chinese text-2xl font-semibold text-foreground">{normalizedText}</div>
                                <div className="text-sm text-muted-foreground">{pinyin}</div>
                              </TableCell>
                              <TableCell>
                                <ChangeTypeBadge value={row.changeClassification} />
                              </TableCell>
                              <TableCell>
                                <ReviewStatusBadge value={row.reviewStatus} />
                              </TableCell>
                              <TableCell>
                                <ApplyStatusBadge value={row.applyStatus} />
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                #{row.sourceRowNumber ?? t("common.notAvailable")}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button asChild variant="ghost" size="sm">
                                  <Link href={rowHref}>{t("common.openDetail")}</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </section>
                )}
              </form>

              <form action={approveAllEligibleContentSyncRowsAction} className="flex justify-end">
                <div className="flex flex-wrap gap-3">
                  <input type="hidden" name="batch_id" value={data.selectedBatch.id} />
                  <input type="hidden" name="return_q" value={data.filters.q} />
                  <input type="hidden" name="return_change_type" value={data.filters.changeType} />
                  <input type="hidden" name="return_review_status" value={data.filters.reviewStatus} />
                  <input type="hidden" name="return_apply_status" value={data.filters.applyStatus} />
                  {data.selectedRow ? <input type="hidden" name="return_row_id" value={data.selectedRow.id} /> : null}
                  <Button type="submit" variant="outline">
                    Approve all eligible
                  </Button>
                  <Button type="submit" formAction={applyAllApprovedContentSyncRowsAction} variant="secondary">
                    Apply all approved
                  </Button>
                </div>
              </form>

              {selectedRowFormValue ? (
                <Card className="border-border/80 bg-card/95">
                  <CardHeader>
                    <CardTitle>Review row detail</CardTitle>
                    <CardDescription>
                      Inspect staged content, adjust the admin-edited payload, approve or reject it, and apply approved rows into production when ready.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <ChangeTypeBadge value={selectedRowFormValue.changeClassification} />
                      <ReviewStatusBadge value={selectedRowFormValue.reviewStatus} />
                      <ApplyStatusBadge value={selectedRowFormValue.applyStatus} />
                      <Badge variant="outline">Source row #{selectedRowFormValue.sourceRowNumber ?? t("common.notAvailable")}</Badge>
                      <Badge variant="outline">Match: {selectedRowFormValue.matchResult ?? t("common.notAvailable")}</Badge>
                    </div>

                    <Tabs defaultValue="edit">
                      <TabsList>
                        <TabsTrigger value="edit">Edit</TabsTrigger>
                        <TabsTrigger value="diff">Diff</TabsTrigger>
                        <TabsTrigger value="payloads">Payloads</TabsTrigger>
                        <TabsTrigger value="issues">Issues</TabsTrigger>
                      </TabsList>

                      <TabsContent value="edit">
                        <form action={saveContentSyncRowEditsAction} className="space-y-6">
                          <input type="hidden" name="row_id" value={selectedRowFormValue.id} />
                          <input type="hidden" name="batch_id" value={data.selectedBatch.id} />
                          <input type="hidden" name="return_q" value={data.filters.q} />
                          <input type="hidden" name="return_change_type" value={data.filters.changeType} />
                          <input type="hidden" name="return_review_status" value={data.filters.reviewStatus} />
                          <input type="hidden" name="return_apply_status" value={data.filters.applyStatus} />
                          <input type="hidden" name="return_row_id" value={selectedRowFormValue.id} />

                          {(() => {
                            const formValue = getEditablePayloadForForm(selectedRowFormValue);

                            return (
                              <div className="grid gap-4 md:grid-cols-2">
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
                                <Field label="Main radicals" hint="Pipe-delimited values">
                                  <input name="main_radicals" defaultValue={formValue.mainRadicals} className={inputClassName()} />
                                </Field>
                                <Field label="Topic tags" hint="Pipe-delimited values">
                                  <input name="topic_tags" defaultValue={formValue.topicTags} className={inputClassName()} />
                                </Field>
                                <Field label="Part of speech">
                                  <input name="part_of_speech" defaultValue={formValue.partOfSpeech} className={inputClassName()} />
                                </Field>
                                <Field label="Character structure type">
                                  <input name="character_structure_type" defaultValue={formValue.characterStructureType} className={inputClassName()} />
                                </Field>
                                <Field label="Source confidence">
                                  <select name="source_confidence" defaultValue={formValue.sourceConfidence} className={inputClassName()}>
                                    <option value="">Not set</option>
                                    <option value="low">low</option>
                                    <option value="medium">medium</option>
                                    <option value="high">high</option>
                                  </select>
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
                                <Field label="Review status">
                                  <select name="review_status" defaultValue={formValue.reviewStatus} className={inputClassName()}>
                                    <option value="pending">pending</option>
                                    <option value="needs_review">needs_review</option>
                                    <option value="approved">approved</option>
                                    <option value="rejected">rejected</option>
                                    <option value="applied">applied</option>
                                  </select>
                                </Field>
                                <Field label="Source updated at">
                                  <input name="source_updated_at" defaultValue={formValue.sourceUpdatedAt} className={inputClassName()} />
                                </Field>
                                <Field label="Radical summary" >
                                  <textarea name="radical_summary" defaultValue={formValue.radicalSummary} className={textareaClassName("min-h-24")} />
                                </Field>
                                <Field label="Structure explanation">
                                  <textarea name="structure_explanation" defaultValue={formValue.structureExplanation} className={textareaClassName("min-h-24")} />
                                </Field>
                                <Field label="Mnemonic">
                                  <textarea name="mnemonic" defaultValue={formValue.mnemonic} className={textareaClassName("min-h-24")} />
                                </Field>
                                <Field label="Notes">
                                  <textarea name="notes" defaultValue={formValue.notes} className={textareaClassName("min-h-24")} />
                                </Field>
                                <Field label="Similar chars" hint="Pipe-delimited values">
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
                                <div className="md:col-span-2">
                                  <Field label="Examples" hint="One example per line: Chinese | Pinyin | Vietnamese meaning">
                                    <textarea name="examples_text" defaultValue={formValue.examplesText} className={textareaClassName("min-h-32")} />
                                  </Field>
                                </div>
                                <label className="inline-flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/20 px-4 py-3 text-sm font-medium text-foreground">
                                  <input
                                    type="checkbox"
                                    name="ambiguity_flag"
                                    defaultChecked={formValue.ambiguityFlag}
                                    className="size-4 rounded border-border text-primary focus-ring"
                                  />
                                  Ambiguity flag
                                </label>
                              </div>
                            );
                          })()}

                          <div className="flex flex-wrap gap-3">
                            <Button type="submit">{t("common.save")}</Button>
                          </div>
                        </form>

                        <form action={reviewContentSyncRowAction} className="mt-6 space-y-4 border-t border-border/70 pt-6">
                          <input type="hidden" name="row_id" value={selectedRowFormValue.id} />
                          <input type="hidden" name="batch_id" value={data.selectedBatch.id} />
                          <input type="hidden" name="return_q" value={data.filters.q} />
                          <input type="hidden" name="return_change_type" value={data.filters.changeType} />
                          <input type="hidden" name="return_review_status" value={data.filters.reviewStatus} />
                          <input type="hidden" name="return_apply_status" value={data.filters.applyStatus} />
                          <input type="hidden" name="return_row_id" value={selectedRowFormValue.id} />
                          {(() => {
                            const formValue = getEditablePayloadForForm(selectedRowFormValue);
                            return (
                              <>
                                <input type="hidden" name="normalized_text" value={formValue.normalizedText} />
                                <input type="hidden" name="pinyin" value={formValue.pinyin} />
                                <input type="hidden" name="meanings_vi" value={formValue.meaningsVi} />
                                <input type="hidden" name="han_viet" value={formValue.hanViet} />
                                <input type="hidden" name="traditional_variant" value={formValue.traditionalVariant} />
                                <input type="hidden" name="main_radicals" value={formValue.mainRadicals} />
                                <input type="hidden" name="radical_summary" value={formValue.radicalSummary} />
                                <input type="hidden" name="hsk_level" value={formValue.hskLevel} />
                                <input type="hidden" name="part_of_speech" value={formValue.partOfSpeech} />
                                <input type="hidden" name="topic_tags" value={formValue.topicTags} />
                                <input type="hidden" name="examples_text" value={formValue.examplesText} />
                                <input type="hidden" name="similar_chars" value={formValue.similarChars} />
                                <input type="hidden" name="character_structure_type" value={formValue.characterStructureType} />
                                <input type="hidden" name="structure_explanation" value={formValue.structureExplanation} />
                                <input type="hidden" name="mnemonic" value={formValue.mnemonic} />
                                <input type="hidden" name="notes" value={formValue.notes} />
                                <input type="hidden" name="source_confidence" value={formValue.sourceConfidence} />
                                <input type="hidden" name="ambiguity_note" value={formValue.ambiguityNote} />
                                <input type="hidden" name="reading_candidates" value={formValue.readingCandidates} />
                                <input type="hidden" name="review_status" value={formValue.reviewStatus} />
                                <input type="hidden" name="ai_status" value={formValue.aiStatus} />
                                <input type="hidden" name="source_updated_at" value={formValue.sourceUpdatedAt} />
                                <input type="hidden" name="review_note" value={formValue.reviewNote} />
                                {formValue.ambiguityFlag ? <input type="hidden" name="ambiguity_flag" value="true" /> : null}
                              </>
                            );
                          })()}

                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="submit"
                              name="decision"
                              value="approve"
                              disabled={
                                selectedRowFormValue.reviewStatus === "applied" ||
                                selectedRowFormValue.applyStatus === "applied" ||
                                selectedRowFormValue.applyStatus === "skipped"
                              }
                            >
                              Approve row
                            </Button>
                            <Button
                              type="submit"
                              name="decision"
                              value="reject"
                              variant="outline"
                              disabled={
                                selectedRowFormValue.reviewStatus === "applied" ||
                                selectedRowFormValue.applyStatus === "applied" ||
                                selectedRowFormValue.applyStatus === "skipped"
                              }
                            >
                              Reject row
                            </Button>
                          </div>
                        </form>

                        <form action={applyContentSyncRowAction} className="mt-6 border-t border-border/70 pt-6">
                          <input type="hidden" name="row_id" value={selectedRowFormValue.id} />
                          <input type="hidden" name="batch_id" value={data.selectedBatch.id} />
                          <input type="hidden" name="return_q" value={data.filters.q} />
                          <input type="hidden" name="return_change_type" value={data.filters.changeType} />
                          <input type="hidden" name="return_review_status" value={data.filters.reviewStatus} />
                          <input type="hidden" name="return_apply_status" value={data.filters.applyStatus} />
                          <input type="hidden" name="return_row_id" value={selectedRowFormValue.id} />
                          <Button
                            type="submit"
                            variant="secondary"
                            disabled={
                              selectedRowFormValue.reviewStatus !== "approved" ||
                              selectedRowFormValue.applyStatus === "applied" ||
                              selectedRowFormValue.applyStatus === "skipped"
                            }
                          >
                            {selectedRowFormValue.applyStatus === "applied"
                              ? "Already applied"
                              : selectedRowFormValue.applyStatus === "skipped"
                                ? "Skipped as unchanged"
                                : selectedRowFormValue.applyStatus === "failed"
                                  ? "Retry apply"
                                  : "Apply row"}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="diff">
                        <pre className="overflow-x-auto rounded-2xl border border-border/80 bg-muted/20 p-4 text-xs leading-6 text-foreground">
                          {JSON.stringify(selectedRowFormValue.diffSummary ?? { message: "No diff summary available." }, null, 2)}
                        </pre>
                      </TabsContent>

                      <TabsContent value="payloads">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div>
                            <p className="mb-2 text-sm font-semibold text-foreground">Raw payload</p>
                            <pre className="overflow-x-auto rounded-2xl border border-border/80 bg-muted/20 p-4 text-xs leading-6 text-foreground">
                              {JSON.stringify(selectedRowFormValue.rawPayload, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="mb-2 text-sm font-semibold text-foreground">Normalized payload</p>
                            <pre className="overflow-x-auto rounded-2xl border border-border/80 bg-muted/20 p-4 text-xs leading-6 text-foreground">
                              {JSON.stringify(selectedRowFormValue.adminEditedPayload ?? selectedRowFormValue.normalizedPayload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="issues">
                        <div className="space-y-4">
                          {selectedRowFormValue.changeClassification === "conflict" ? (
                            <Card className="border-amber-200 bg-amber-50">
                              <CardHeader>
                                <CardTitle className="text-amber-700">Conflict guidance</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3 text-sm text-amber-700">
                                <p>
                                  {typeof selectedRowFormValue.diffSummary?.guidance === "string"
                                    ? selectedRowFormValue.diffSummary.guidance
                                    : "This row matched more than one production word. Compare pinyin, part of speech, and source identity before approving it."}
                                </p>
                                {Array.isArray(selectedRowFormValue.diffSummary?.candidates) &&
                                selectedRowFormValue.diffSummary.candidates.length > 0 ? (
                                  <div className="space-y-2 rounded-2xl border border-amber-200 bg-white/70 p-3">
                                    {selectedRowFormValue.diffSummary.candidates.map((candidate, index) => {
                                      const entry =
                                        candidate && typeof candidate === "object"
                                          ? (candidate as Record<string, unknown>)
                                          : null;

                                      if (!entry) {
                                        return null;
                                      }

                                      return (
                                        <div key={String(entry.id ?? index)} className="rounded-xl border border-amber-100 bg-white p-3">
                                          <div className="font-medium text-foreground">
                                            {String(entry.normalizedText ?? "Unknown")}
                                          </div>
                                          <div className="mt-1 text-xs text-muted-foreground">
                                            {String(entry.pinyin ?? "No pinyin")} · {String(entry.partOfSpeech ?? "No part of speech")}
                                          </div>
                                          <div className="mt-1 text-xs text-muted-foreground">
                                            slug: {String(entry.slug ?? "n/a")} · source key: {String(entry.sourceRowKey ?? "n/a")}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </CardContent>
                            </Card>
                          ) : null}

                          {selectedRowFormValue.parseErrors.length === 0 ? (
                            <EmptyState
                              title="No parse errors for this row"
                              description="This staged row normalized successfully and is ready for manual review."
                            />
                          ) : (
                            <Card className="border-rose-200 bg-rose-50">
                              <CardHeader>
                                <CardTitle className="text-rose-700">Parse errors</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ul className="space-y-2 text-sm text-rose-700">
                                  {selectedRowFormValue.parseErrors.map((error) => (
                                    <li key={error}>• {error}</li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          )}

                          {selectedRowFormValue.errorMessage ? (
                            <Card className="border-amber-200 bg-amber-50">
                              <CardHeader>
                                <CardTitle className="text-amber-700">Stored review issue</CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm text-amber-700">
                                {selectedRowFormValue.errorMessage}
                              </CardContent>
                            </Card>
                          ) : null}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
