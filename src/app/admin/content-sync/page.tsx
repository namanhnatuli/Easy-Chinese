import Link from "next/link";
import { CheckCheck, CircleOff, FileStack, FileWarning, GitCompare, History, Search, Sparkles } from "lucide-react";

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
import {
  approveAllEligibleContentSyncRowsAction,
  approveContentSyncRowAction,
  rejectContentSyncRowAction,
  bulkReviewContentSyncRowsAction,
  getContentSyncPageData,
  retryContentSyncPreviewBatchAction,
  saveContentSyncRowEditsAction,
  startContentSyncPreviewAction,
} from "@/features/admin/content-sync";
import { listRadicals } from "@/features/admin/radicals";
import { parseContentSyncFilters } from "@/features/admin/content-sync-utils";
import { getVocabSyncPreviewRows, getVocabSyncStagedRowCounts } from "@/features/vocabulary-sync/preview";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { ContentSyncDetailDialog } from "@/components/admin/content-sync-detail-dialog";
import { ContentSyncBatchDialog } from "@/components/admin/content-sync-batch-dialog";
import { ContentSyncBatchHistoryTable } from "@/components/admin/content-sync-batch-history-table";
import { ContentSyncReviewModule } from "@/components/admin/content-sync-review-module";
import { buildContentSyncPath } from "@/features/admin/content-sync-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function AdminContentSyncPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const { t, link } = await getServerI18n();
  const searchParamsValue = await searchParams;
  const filters = parseContentSyncFilters(searchParamsValue);
  const data = await getContentSyncPageData(filters);
  const error = typeof searchParamsValue.error === "string" ? searchParamsValue.error : null;
  const viewBatchId = typeof searchParamsValue.viewBatch === "string" ? searchParamsValue.viewBatch : null;
  const viewBatch = viewBatchId ? data.batches.find((b) => b.id === viewBatchId) || null : null;
  const viewBatchRows = viewBatch ? await getVocabSyncPreviewRows(viewBatch.id) : [];
  const batchRowCounts = await getVocabSyncStagedRowCounts(data.batches.map((batch) => batch.id));

  const env = getServerEnv();
  const radicals = await listRadicals();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Sync"
        title="Google Sheets vocabulary sync"
        description="Preview staged vocabulary rows, inspect AI-generated changes, and approve or reject them. Approved rows sync into production immediately."
        actions={
          <Button asChild variant="outline">
            <Link href={link("/admin")}>{t("common.admin")}</Link>
          </Button>
        }
      />

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="mt-0.5 rounded-full bg-destructive/10 p-1 text-destructive">
              <CircleOff className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-destructive">Google Sheets API Error</p>
              <p className="text-sm text-destructive/80 leading-relaxed">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue={data.filters.view === "resolved" ? "resolved" : "queue"} className="w-full">
        <TabsList className="bg-background/50 border rounded-full p-1 h-auto flex flex-wrap justify-start gap-1">
          <TabsTrigger asChild value="queue">
            <Link href={link(buildContentSyncPath({ ...data.filters, view: "queue", reviewStatus: null, applyStatus: null }))}>
              Review Queue
            </Link>
          </TabsTrigger>
          <TabsTrigger asChild value="resolved">
            <Link href={link(buildContentSyncPath({ ...data.filters, view: "resolved", reviewStatus: null, applyStatus: null }))}>
              Resolved History
            </Link>
          </TabsTrigger>
          {data.selectedBatch && (
            <TabsTrigger value="stats">Detailed Insights</TabsTrigger>
          )}
          <TabsTrigger value="batch-sync">Batch Sync</TabsTrigger>
        </TabsList>

        <TabsContent value={data.filters.view === "resolved" ? "resolved" : "queue"}>
          {!data.selectedBatch && data.filteredRows.length === 0 ? (
            <div className="pt-6">
              <EmptyState
                title={data.filters.view === "resolved" ? "No resolved sync rows" : "No sync rows in review queue"}
                description={
                  data.filters.view === "resolved"
                    ? "No rows have been approved, rejected, or applied yet. Choose a batch from history or process rows from the review queue."
                    : "Start a new preview or choose a batch from history to inspect its staged rows."
                }
              />
            </div>
          ) : (
            <div className="space-y-6 pt-6">
              <FilterBar>
                <form action={link("/admin/content-sync")} className="grid w-full gap-3 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_auto]">
                  <input type="hidden" name="view" value={data.filters.view} />
                  {data.selectedBatch ? <input type="hidden" name="batch" value={data.selectedBatch.id} /> : null}
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
                      <Link href={link(data.selectedBatch ? `/admin/content-sync?batch=${data.selectedBatch.id}&view=${data.filters.view}` : `/admin/content-sync?view=${data.filters.view}`)}>{t("common.reset")}</Link>
                    </Button>
                  </div>
                </form>
              </FilterBar>

              {!data.selectedBatch && data.filters.view === "queue" ? (
                <Card className="border-border/80 bg-card/95">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-semibold">Global review queue</p>
                      <p className="text-xs text-muted-foreground">
                        Showing all sync rows across batches that are still in `pending` or `needs_review`.
                      </p>
                    </div>
                    <Badge variant="secondary">{data.filteredRows.length} rows</Badge>
                  </CardContent>
                </Card>
              ) : null}

              {!data.selectedBatch && data.filters.view === "resolved" ? (
                <Card className="border-border/80 bg-card/95">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-semibold">Global resolved history</p>
                      <p className="text-xs text-muted-foreground">
                        Showing all sync rows across batches that are no longer in `pending` or `needs_review`.
                      </p>
                    </div>
                    <Badge variant="secondary">{data.filteredRows.length} rows</Badge>
                  </CardContent>
                </Card>
              ) : null}

              <ContentSyncReviewModule 
                rows={data.filteredRows}
                batchId={data.selectedBatch?.id ?? ""}
                filters={data.filters}
                bulkAction={bulkReviewContentSyncRowsAction}
                approveAllAction={approveAllEligibleContentSyncRowsAction}
              />

              {data.selectedRow ? (
                <ContentSyncDetailDialog 
                  row={data.selectedRow}
                  batchId={data.filters.batchId ?? ""}
                  filters={data.filters}
                  saveAction={saveContentSyncRowEditsAction}
                  approveAction={approveContentSyncRowAction}
                  rejectAction={rejectContentSyncRowAction}
                  radicals={radicals}
                />
              ) : null}
            </div>
          )}
        </TabsContent>

        {data.selectedBatch && (
          <TabsContent value="stats" className="space-y-8 pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">{data.selectedBatch.sourceSheetName || "Current Batch"}</h3>
                <p className="text-sm text-muted-foreground">Detailed analytical insights and row distribution.</p>
              </div>
              <form action={retryContentSyncPreviewBatchAction}>
                <input type="hidden" name="batch_id" value={data.selectedBatch.id} />
                <Button type="submit" variant="outline" size="sm">
                  Retry preview batch
                </Button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80">Source Classification</p>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                  <StatCard variant="compact" label="New" value={String(data.summary?.new ?? 0)} description="Rows with no production match yet." icon={<Sparkles className="size-4" />} />
                  <StatCard variant="compact" label="Changed" value={String(data.summary?.changed ?? 0)} description="Matched rows where meaningful content differs." icon={<GitCompare className="size-4" />} accent="warning" />
                  <StatCard variant="compact" label="Unchanged" value={String(data.summary?.unchanged ?? 0)} description="Rows auto-skipped because staged content already matches production." icon={<CheckCheck className="size-4" />} />
                  <StatCard variant="compact" label="Conflict" value={String(data.summary?.conflict ?? 0)} description="Rows that still need human disambiguation." icon={<FileWarning className="size-4" />} />
                  <StatCard variant="compact" label="Invalid" value={String(data.summary?.invalid ?? 0)} description="Rows blocked by parse or validation issues." icon={<CircleOff className="size-4" />} />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80">Review & Action Status</p>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                  <StatCard variant="compact" label="Approved" value={String(data.summary?.approved ?? 0)} description="Rows approved but not fully completed because sync is still pending or failed." icon={<CheckCheck className="size-4" />} accent="success" />
                  <StatCard variant="compact" label="Applied" value={String(data.summary?.applied ?? 0)} description="Rows already synced to production or skipped because data was unchanged." icon={<CheckCheck className="size-4" />} accent="success" />
                  <StatCard variant="compact" label="Rejected" value={String(data.summary?.rejected ?? 0)} description="Rows rejected from the staged review queue." icon={<CircleOff className="size-4" />} />
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="batch-sync" className="pt-6">
          <div className="space-y-6">
            <Card className="border-border/80 bg-card/95">
              <CardHeader>
                <CardTitle>Start preview sync</CardTitle>
                <CardDescription>
                  Enter a spreadsheet ID and sheet name to pull rows into the staged review queue.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContentSyncStartForm
                  action={startContentSyncPreviewAction}
                  labels={{
                    spreadsheetId: "Spreadsheet ID",
                    spreadsheetHint: env.GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID
                      ? `Optional. Defaults to ${env.GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID.slice(0, 10)}...`
                      : "Required if GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID is not set.",
                    sheetName: "Sheet name",
                    sheetHint: env.GOOGLE_SHEETS_DEFAULT_SHEET_NAME
                      ? `Optional. Defaults to "${env.GOOGLE_SHEETS_DEFAULT_SHEET_NAME}".`
                      : "Required if GOOGLE_SHEETS_DEFAULT_SHEET_NAME is not set.",
                    submit: "Start preview",
                    pending: "Starting preview…",
                  }}
                />
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="size-5" />
                  Batch history
                </CardTitle>
                <CardDescription>Recent preview runs available for review.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.batches.length === 0 ? (
                  <EmptyState title="No sync history" description="Start your first preview to begin." />
                ) : (
                  <ContentSyncBatchHistoryTable
                    batches={data.batches}
                    batchRowCounts={Object.fromEntries(batchRowCounts)}
                    activeBatchId={data.selectedBatch?.id ?? null}
                    selectedBatchId={data.filters.batchId}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ContentSyncBatchDialog
        batch={viewBatch}
        filters={data.filters}
        rows={viewBatchRows}
      />
    </div>
  );
}
