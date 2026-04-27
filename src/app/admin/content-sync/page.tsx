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
        eyebrow={t("contentSync.header.eyebrow")}
        title={t("contentSync.header.title")}
        description={t("contentSync.header.description")}
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
              <p className="text-sm font-semibold text-destructive">{t("contentSync.error.title")}</p>
              <p className="text-sm text-destructive/80 leading-relaxed">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue={data.filters.view === "resolved" ? "resolved" : "queue"} className="w-full">
        <TabsList className="bg-background/50 border rounded-full p-1 h-auto flex flex-wrap justify-start gap-1">
          <TabsTrigger asChild value="queue">
            <Link href={link(buildContentSyncPath({ ...data.filters, view: "queue", reviewStatus: null, applyStatus: null }))}>
              {t("contentSync.tabs.queue")}
            </Link>
          </TabsTrigger>
          <TabsTrigger asChild value="resolved">
            <Link href={link(buildContentSyncPath({ ...data.filters, view: "resolved", reviewStatus: null, applyStatus: null }))}>
              {t("contentSync.tabs.resolved")}
            </Link>
          </TabsTrigger>
          {data.selectedBatch && (
            <TabsTrigger value="stats">{t("contentSync.tabs.stats")}</TabsTrigger>
          )}
          <TabsTrigger value="batch-sync">{t("contentSync.tabs.batchSync")}</TabsTrigger>
        </TabsList>

        <TabsContent value={data.filters.view === "resolved" ? "resolved" : "queue"}>
          {!data.selectedBatch && data.filteredRows.length === 0 ? (
            <div className="pt-6">
              <EmptyState
                title={data.filters.view === "resolved" ? t("contentSync.empty.noResolvedRows") : t("contentSync.empty.noQueueRows")}
                description={
                  data.filters.view === "resolved"
                    ? t("contentSync.empty.noResolvedRowsDescription")
                    : t("contentSync.empty.noQueueRowsDescription")
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
                      placeholder={t("contentSync.filters.searchPlaceholder")}
                    />
                  </div>
                  <select name="changeType" defaultValue={data.filters.changeType} className={inputClassName()}>
                    <option value="all">{t("contentSync.filters.allChangeTypes")}</option>
                    <option value="new">{t("contentSync.status.changeType.new")}</option>
                    <option value="changed">{t("contentSync.status.changeType.changed")}</option>
                    <option value="unchanged">{t("contentSync.status.changeType.unchanged")}</option>
                    <option value="conflict">{t("contentSync.status.changeType.conflict")}</option>
                    <option value="invalid">{t("contentSync.status.changeType.invalid")}</option>
                  </select>
                  <select name="reviewStatus" defaultValue={data.filters.reviewStatus} className={inputClassName()}>
                    <option value="all">{t("contentSync.filters.allReviewStates")}</option>
                    <option value="pending">{t("contentSync.status.review.pending")}</option>
                    <option value="needs_review">{t("contentSync.status.review.needsReview")}</option>
                    <option value="approved">{t("contentSync.status.review.approved")}</option>
                    <option value="rejected">{t("contentSync.status.review.rejected")}</option>
                    <option value="applied">{t("contentSync.status.review.applied")}</option>
                  </select>
                  <select name="applyStatus" defaultValue={data.filters.applyStatus} className={inputClassName()}>
                    <option value="all">{t("contentSync.filters.allApplyStates")}</option>
                    <option value="pending">{t("contentSync.status.apply.pending")}</option>
                    <option value="applied">{t("contentSync.status.apply.applied")}</option>
                    <option value="failed">{t("contentSync.status.apply.failed")}</option>
                    <option value="skipped">{t("contentSync.status.apply.skipped")}</option>
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
                      <p className="text-sm font-semibold">{t("contentSync.overview.globalQueueTitle")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("contentSync.overview.globalQueueDescription")}
                      </p>
                    </div>
                    <Badge variant="secondary">{data.filteredRows.length} {t("contentSync.queue.rowsLabel")}</Badge>
                  </CardContent>
                </Card>
              ) : null}

              {!data.selectedBatch && data.filters.view === "resolved" ? (
                <Card className="border-border/80 bg-card/95">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-semibold">{t("contentSync.overview.globalResolvedTitle")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("contentSync.overview.globalResolvedDescription")}
                      </p>
                    </div>
                    <Badge variant="secondary">{data.filteredRows.length} {t("contentSync.queue.rowsLabel")}</Badge>
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
                <h3 className="text-xl font-bold">{data.selectedBatch.sourceSheetName || t("contentSync.stats.currentBatch")}</h3>
                <p className="text-sm text-muted-foreground">{t("contentSync.stats.detailDescription")}</p>
              </div>
              <form action={retryContentSyncPreviewBatchAction}>
                <input type="hidden" name="batch_id" value={data.selectedBatch.id} />
                <Button type="submit" variant="outline" size="sm">
                  {t("common.tryAgain")}
                </Button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80">{t("contentSync.stats.sourceClassification")}</p>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                  <StatCard variant="compact" label={t("contentSync.stats.new.label")} value={String(data.summary?.new ?? 0)} description={t("contentSync.stats.new.description")} icon={<Sparkles className="size-4" />} />
                  <StatCard variant="compact" label={t("contentSync.stats.changed.label")} value={String(data.summary?.changed ?? 0)} description={t("contentSync.stats.changed.description")} icon={<GitCompare className="size-4" />} accent="warning" />
                  <StatCard variant="compact" label={t("contentSync.stats.unchanged.label")} value={String(data.summary?.unchanged ?? 0)} description={t("contentSync.stats.unchanged.description")} icon={<CheckCheck className="size-4" />} />
                  <StatCard variant="compact" label={t("contentSync.stats.conflict.label")} value={String(data.summary?.conflict ?? 0)} description={t("contentSync.stats.conflict.description")} icon={<FileWarning className="size-4" />} />
                  <StatCard variant="compact" label={t("contentSync.stats.invalid.label")} value={String(data.summary?.invalid ?? 0)} description={t("contentSync.stats.invalid.description")} icon={<CircleOff className="size-4" />} />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80">{t("contentSync.stats.reviewAndActionStatus")}</p>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                  <StatCard variant="compact" label={t("contentSync.stats.approved.label")} value={String(data.summary?.approved ?? 0)} description={t("contentSync.stats.approved.description")} icon={<CheckCheck className="size-4" />} accent="success" />
                  <StatCard variant="compact" label={t("contentSync.stats.applied.label")} value={String(data.summary?.applied ?? 0)} description={t("contentSync.stats.applied.description")} icon={<CheckCheck className="size-4" />} accent="success" />
                  <StatCard variant="compact" label={t("contentSync.stats.rejected.label")} value={String(data.summary?.rejected ?? 0)} description={t("contentSync.stats.rejected.description")} icon={<CircleOff className="size-4" />} />
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="batch-sync" className="pt-6">
          <div className="space-y-6">
            <Card className="border-border/80 bg-card/95">
              <CardHeader>
                <CardTitle>{t("contentSync.batchSync.startTitle")}</CardTitle>
                <CardDescription>
                  {t("contentSync.batchSync.startDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContentSyncStartForm
                  action={startContentSyncPreviewAction}
                  labels={{
                    spreadsheetId: t("contentSync.batchSync.spreadsheetId"),
                    spreadsheetPlaceholder: t("contentSync.batchSync.spreadsheetPlaceholder"),
                    spreadsheetHint: env.GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID
                      ? t("contentSync.batchSync.spreadsheetHintDefault", { value: env.GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID.slice(0, 10) })
                      : t("contentSync.batchSync.spreadsheetHintRequired"),
                    sheetName: t("contentSync.batchSync.sheetName"),
                    sheetPlaceholder: t("contentSync.batchSync.sheetPlaceholder"),
                    sheetHint: env.GOOGLE_SHEETS_DEFAULT_SHEET_NAME
                      ? t("contentSync.batchSync.sheetHintDefault", { value: env.GOOGLE_SHEETS_DEFAULT_SHEET_NAME })
                      : t("contentSync.batchSync.sheetHintRequired"),
                    submit: t("contentSync.batchSync.startPreview"),
                    pending: t("contentSync.batchSync.startingPreview"),
                  }}
                />
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="size-5" />
                  {t("contentSync.batchSync.historyTitle")}
                </CardTitle>
                <CardDescription>{t("contentSync.batchSync.historyDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.batches.length === 0 ? (
                  <EmptyState title={t("contentSync.empty.noHistory")} description={t("contentSync.empty.noHistoryDescription")} />
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
