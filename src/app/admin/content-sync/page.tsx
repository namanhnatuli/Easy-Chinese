import Link from "next/link";
import { CheckCheck, CircleOff, FileWarning, GitCompare, History, Search, Sparkles } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ContentSyncStartForm } from "@/components/admin/content-sync-start-form";
import {
  ApplyStatusBadge,
  ChangeTypeBadge,
  ReviewStatusBadge,
} from "@/components/admin/content-sync-status-badge";
import { Field, inputClassName } from "@/components/admin/form-primitives";
import { FilterBar } from "@/components/shared/filter-bar";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  approveAllEligibleContentSyncRowsAction,
  approveContentSyncRowAction,
  applyContentSyncRowAction,
  rejectContentSyncRowAction,
  bulkReviewContentSyncRowsAction,
  bulkApplyApprovedContentSyncRowsAction,
  applyAllApprovedContentSyncRowsAction,
  getContentSyncPageData,
  retryContentSyncPreviewBatchAction,
  saveContentSyncRowEditsAction,
  startContentSyncPreviewAction,
} from "@/features/admin/content-sync";
import {
  applyAllApprovedGrammarSyncRowsAction,
  applyGrammarSyncRowAction,
  approveAllEligibleGrammarSyncRowsAction,
  approveGrammarSyncRowAction,
  getGrammarSyncAdminPageData,
  parseGrammarContentSyncFilters,
  rejectGrammarSyncRowAction,
  startGrammarContentSyncPreviewAction,
} from "@/features/admin/grammar-sync";
import type { GrammarSyncRow } from "@/features/grammar-sync/types";
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
  const syncType = searchParamsValue.sync === "grammar" ? "grammar" : "vocabulary";
  const error = typeof searchParamsValue.error === "string" ? searchParamsValue.error : null;
  const env = getServerEnv();

  if (syncType === "grammar") {
    const grammarFilters = parseGrammarContentSyncFilters(searchParamsValue);
    const grammarData = await getGrammarSyncAdminPageData(grammarFilters);

    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow={t("contentSync.header.eyebrow")}
          title={t("contentSync.grammar.header.title")}
          description={t("contentSync.grammar.header.description")}
          actions={
            <Button asChild variant="outline">
              <Link href={link("/admin")}>{t("common.admin")}</Link>
            </Button>
          }
        />
        <ContentTypeTabs activeType="grammar" link={link} t={t} />
        <SyncErrorCard error={error} />
        <GrammarSyncPanel data={grammarData} env={env} link={link} t={t} />
      </div>
    );
  }

  const filters = parseContentSyncFilters(searchParamsValue);
  const data = await getContentSyncPageData(filters);
  const viewBatchId = typeof searchParamsValue.viewBatch === "string" ? searchParamsValue.viewBatch : null;
  const viewBatch = viewBatchId ? data.batches.find((b) => b.id === viewBatchId) || null : null;
  const viewBatchRows = viewBatch ? await getVocabSyncPreviewRows(viewBatch.id) : [];
  const batchRowCounts = await getVocabSyncStagedRowCounts(data.batches.map((batch) => batch.id));

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
      <ContentTypeTabs activeType="vocabulary" link={link} t={t} />

      <SyncErrorCard error={error} title={t("contentSync.error.title")} />

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
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{data.filteredRows.length} {t("contentSync.queue.rowsLabel")}</Badge>
                      {data.filteredRows.length > 0 && (
                        <form action={approveAllEligibleContentSyncRowsAction}>
                          <input type="hidden" name="return_view" value={data.filters.view} />
                          <SubmitButton 
                            size="sm" 
                            variant="outline" 
                            showOverlay 
                            pendingText={t("common.loading")}
                          >
                            {t("contentSync.queue.bulkApprove")}
                          </SubmitButton>
                        </form>
                      )}
                    </div>
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
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{data.filteredRows.length} {t("contentSync.queue.rowsLabel")}</Badge>
                      {data.filteredRows.length > 0 && (
                        <form action={applyAllApprovedContentSyncRowsAction}>
                          <input type="hidden" name="return_view" value={data.filters.view} />
                          <SubmitButton 
                            size="sm" 
                            variant="outline" 
                            showOverlay 
                            pendingText={t("common.loading")}
                          >
                            {t("contentSync.queue.bulkApply")}
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <ContentSyncReviewModule 
                rows={data.filteredRows}
                batchId={data.selectedBatch?.id ?? ""}
                filters={data.filters}
                bulkAction={data.filters.view === "resolved" ? bulkApplyApprovedContentSyncRowsAction : bulkReviewContentSyncRowsAction}
                approveAllAction={data.filters.view === "resolved" ? applyAllApprovedContentSyncRowsAction : approveAllEligibleContentSyncRowsAction}
              />

              {data.selectedRow ? (
                <ContentSyncDetailDialog 
                  row={data.selectedRow}
                  batchId={data.filters.batchId ?? ""}
                  filters={data.filters}
                  saveAction={saveContentSyncRowEditsAction}
                  approveAction={approveContentSyncRowAction}
                  applyAction={applyContentSyncRowAction}
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
                <SubmitButton variant="outline" size="sm">
                  {t("common.tryAgain")}
                </SubmitButton>
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
                    fromRow: t("contentSync.batchSync.fromRow"),
                    fromRowPlaceholder: t("contentSync.batchSync.fromRowPlaceholder"),
                    fromRowHint: t("contentSync.batchSync.fromRowHint"),
                    toRow: t("contentSync.batchSync.toRow"),
                    toRowPlaceholder: t("contentSync.batchSync.toRowPlaceholder"),
                    toRowHint: t("contentSync.batchSync.toRowHint"),
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

function ContentTypeTabs({
  activeType,
  link,
  t,
}: {
  activeType: "vocabulary" | "grammar";
  link: (href: string) => string;
  t: Awaited<ReturnType<typeof getServerI18n>>["t"];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant={activeType === "vocabulary" ? "default" : "outline"} size="sm">
        <Link href={link("/admin/content-sync")}>{t("contentSync.contentTypes.vocabulary")}</Link>
      </Button>
      <Button asChild variant={activeType === "grammar" ? "default" : "outline"} size="sm">
        <Link href={link("/admin/content-sync?sync=grammar")}>{t("contentSync.contentTypes.grammar")}</Link>
      </Button>
    </div>
  );
}

function SyncErrorCard({ error, title = "Sync error" }: { error: string | null; title?: string }) {
  if (!error) return null;

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="mt-0.5 rounded-full bg-destructive/10 p-1 text-destructive">
          <CircleOff className="size-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-destructive">{title}</p>
          <p className="text-sm text-destructive/80 leading-relaxed">{error}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function getGrammarPayload(row: GrammarSyncRow) {
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

function GrammarReturnFields({
  row,
  filters,
}: {
  row?: GrammarSyncRow;
  filters: Awaited<ReturnType<typeof getGrammarSyncAdminPageData>>["filters"];
}) {
  return (
    <>
      {row ? <input type="hidden" name="row_id" value={row.id} /> : null}
      {filters.batchId ? <input type="hidden" name="batch_id" value={filters.batchId} /> : null}
      <input type="hidden" name="return_view" value={filters.view} />
      <input type="hidden" name="return_q" value={filters.q} />
      <input type="hidden" name="return_change_type" value={filters.changeType} />
      <input type="hidden" name="return_review_status" value={filters.reviewStatus} />
      <input type="hidden" name="return_apply_status" value={filters.applyStatus} />
      {row ? <input type="hidden" name="return_row_id" value={row.id} /> : null}
    </>
  );
}

function GrammarSyncPanel({
  data,
  env,
  link,
  t,
}: {
  data: Awaited<ReturnType<typeof getGrammarSyncAdminPageData>>;
  env: ReturnType<typeof getServerEnv>;
  link: (href: string) => string;
  t: Awaited<ReturnType<typeof getServerI18n>>["t"];
}) {
  const selectedPayload = data.selectedRow ? getGrammarPayload(data.selectedRow) : null;

  return (
    <Tabs defaultValue={data.filters.view === "resolved" ? "resolved" : "queue"} className="w-full">
      <TabsList className="bg-background/50 border rounded-full p-1 h-auto flex flex-wrap justify-start gap-1">
        <TabsTrigger asChild value="queue">
          <Link href={link("/admin/content-sync?sync=grammar")}>{t("contentSync.grammar.tabs.queue")}</Link>
        </TabsTrigger>
        <TabsTrigger asChild value="resolved">
          <Link href={link("/admin/content-sync?sync=grammar&view=resolved")}>{t("contentSync.grammar.tabs.resolved")}</Link>
        </TabsTrigger>
        <TabsTrigger value="batch-sync">{t("contentSync.grammar.tabs.batchSync")}</TabsTrigger>
      </TabsList>

      <TabsContent value={data.filters.view === "resolved" ? "resolved" : "queue"} className="space-y-6 pt-6">
        <FilterBar>
          <form action={link("/admin/content-sync")} className="grid w-full gap-3 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_auto]">
            <input type="hidden" name="sync" value="grammar" />
            <input type="hidden" name="view" value={data.filters.view} />
            {data.selectedBatch ? <input type="hidden" name="batch" value={data.selectedBatch.id} /> : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input name="q" defaultValue={data.filters.q} className={inputClassName("pl-10")} placeholder={t("contentSync.grammar.filters.searchPlaceholder")} />
            </div>
            <select name="changeType" defaultValue={data.filters.changeType} className={inputClassName()}>
              <option value="all">{t("contentSync.filters.allChangeTypes")}</option>
              <option value="new">{t("contentSync.status.changeType.new")}</option>
              <option value="changed">{t("contentSync.status.changeType.changed")}</option>
              <option value="invalid">{t("contentSync.status.changeType.invalid")}</option>
              <option value="conflict">{t("contentSync.status.changeType.conflict")}</option>
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
                <Link href={link(`/admin/content-sync?sync=grammar&view=${data.filters.view}`)}>{t("common.reset")}</Link>
              </Button>
            </div>
          </form>
        </FilterBar>

        {data.summary ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
            <StatCard variant="compact" label={t("contentSync.stats.new.label")} value={String(data.summary.new)} icon={<Sparkles className="size-4" />} />
            <StatCard variant="compact" label={t("contentSync.stats.changed.label")} value={String(data.summary.changed)} icon={<GitCompare className="size-4" />} accent="warning" />
            <StatCard variant="compact" label={t("contentSync.stats.invalid.label")} value={String(data.summary.invalid)} icon={<CircleOff className="size-4" />} />
            <StatCard variant="compact" label={t("contentSync.stats.conflict.label")} value={String(data.summary.conflict)} icon={<FileWarning className="size-4" />} />
            <StatCard variant="compact" label={t("contentSync.stats.approved.label")} value={String(data.summary.approved)} icon={<CheckCheck className="size-4" />} accent="success" />
            <StatCard variant="compact" label={t("contentSync.stats.applied.label")} value={String(data.summary.applied)} icon={<CheckCheck className="size-4" />} accent="success" />
            <StatCard variant="compact" label={t("contentSync.stats.rejected.label")} value={String(data.summary.rejected)} icon={<CircleOff className="size-4" />} />
          </div>
        ) : null}

        <Card className="border-border/80 bg-card/95">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-semibold">{t("contentSync.grammar.rows.title")}</p>
              <p className="text-xs text-muted-foreground">{t("contentSync.grammar.rows.description", { count: data.filteredRows.length })}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={approveAllEligibleGrammarSyncRowsAction}>
                <GrammarReturnFields filters={data.filters} />
                <SubmitButton size="sm" variant="outline">{t("contentSync.grammar.actions.approveEligible")}</SubmitButton>
              </form>
              <form action={applyAllApprovedGrammarSyncRowsAction}>
                <GrammarReturnFields filters={data.filters} />
                <SubmitButton size="sm" variant="outline">{t("contentSync.grammar.actions.applyApproved")}</SubmitButton>
              </form>
            </div>
          </CardContent>
        </Card>

        {data.filteredRows.length === 0 ? (
          <EmptyState title={t("contentSync.grammar.empty.title")} description={t("contentSync.grammar.empty.description")} />
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3">
              {data.filteredRows.map((row) => {
                const payload = getGrammarPayload(row);
                return (
                  <Card key={row.id} className="border-border/80">
                    <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <ChangeTypeBadge value={row.changeClassification} />
                          <ReviewStatusBadge value={row.reviewStatus} />
                          <ApplyStatusBadge value={row.applyStatus} />
                          {payload.hskLevel ? <Badge variant="secondary">HSK {payload.hskLevel}</Badge> : null}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{payload.title || row.sourceRowKey}</p>
                          <p className="mt-1 text-sm text-primary">{payload.structureText}</p>
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{payload.explanationVi}</p>
                        </div>
                        {row.parseErrors.length > 0 || row.errorMessage ? (
                          <p className="text-xs text-destructive">{[...row.parseErrors, row.errorMessage].filter(Boolean).join(" ")}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={link(`/admin/content-sync?sync=grammar&row=${row.id}&view=${data.filters.view}${data.filters.batchId ? `&batch=${data.filters.batchId}` : ""}`)}>{t("contentSync.grammar.actions.review")}</Link>
                        </Button>
                        <form action={approveGrammarSyncRowAction}>
                          <GrammarReturnFields row={row} filters={data.filters} />
                          <SubmitButton size="sm" variant="outline">{t("contentSync.status.review.approved")}</SubmitButton>
                        </form>
                        <form action={applyGrammarSyncRowAction}>
                          <GrammarReturnFields row={row} filters={data.filters} />
                          <SubmitButton size="sm" variant="outline">{t("contentSync.grammar.actions.apply")}</SubmitButton>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {data.selectedRow && selectedPayload ? (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>{selectedPayload.title || data.selectedRow.sourceRowKey}</CardTitle>
              <CardDescription>{selectedPayload.slug}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{t("contentSync.grammar.detail.structure")}</p>
                  <p className="mt-1 rounded-lg bg-muted p-3 text-sm font-medium text-primary">{selectedPayload.structureText}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{t("contentSync.grammar.detail.explanation")}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{selectedPayload.explanationVi}</p>
                </div>
              </div>
              {selectedPayload.notes ? <p className="text-sm text-muted-foreground">{selectedPayload.notes}</p> : null}
              {selectedPayload.examples.length > 0 ? (
                <div className="grid gap-3">
                  {selectedPayload.examples.map((example) => (
                    <div key={`${example.sortOrder}-${example.chineseText}`} className="rounded-lg border p-3">
                      <p className="font-semibold">{example.chineseText}</p>
                      {example.pinyin ? <p className="mt-1 text-pinyin">{example.pinyin}</p> : null}
                      {example.vietnameseMeaning ? <p className="mt-2 text-sm text-muted-foreground">{example.vietnameseMeaning}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </TabsContent>

      <TabsContent value="batch-sync" className="pt-6">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>{t("contentSync.grammar.batchSync.startTitle")}</CardTitle>
              <CardDescription>{t("contentSync.grammar.batchSync.startDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={startGrammarContentSyncPreviewAction} className="grid gap-x-4 gap-y-4 lg:grid-cols-[2fr_2fr_1fr_1fr_auto] lg:items-start">
                <Field label={t("contentSync.batchSync.spreadsheetId")} hint={env.GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID ? t("contentSync.batchSync.spreadsheetHintDefault", { value: env.GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID.slice(0, 10) }) : t("contentSync.batchSync.spreadsheetHintRequired")}>
                  <input name="spreadsheet_id" className={inputClassName()} placeholder={t("contentSync.grammar.batchSync.useEnvDefault")} />
                </Field>
                <Field label={t("contentSync.grammar.batchSync.sheetName")} hint={env.GOOGLE_SHEETS_GRAMMAR_SHEET_NAME ? t("contentSync.batchSync.sheetHintDefault", { value: env.GOOGLE_SHEETS_GRAMMAR_SHEET_NAME }) : t("contentSync.grammar.batchSync.sheetHintRequired")}>
                  <input name="sheet_name" className={inputClassName()} placeholder={t("contentSync.grammar.batchSync.sheetPlaceholder")} />
                </Field>
                <Field label={t("contentSync.batchSync.fromRow")} hint={t("contentSync.batchSync.fromRowHint")}>
                  <input name="sync_from_row" type="number" min="1" className={inputClassName()} placeholder={t("contentSync.batchSync.fromRowPlaceholder")} />
                </Field>
                <Field label={t("contentSync.batchSync.toRow")} hint={t("contentSync.batchSync.toRowHint")}>
                  <input name="sync_to_row" type="number" min="1" className={inputClassName()} placeholder={t("contentSync.batchSync.toRowPlaceholder")} />
                </Field>
                <div className="lg:pt-7">
                  <SubmitButton>{t("contentSync.batchSync.startPreview")}</SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-5" />
                {t("contentSync.grammar.batchSync.historyTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.batches.length === 0 ? (
                <EmptyState title={t("contentSync.grammar.batchSync.noHistoryTitle")} description={t("contentSync.grammar.batchSync.noHistoryDescription")} />
              ) : (
                <div className="grid gap-3">
                  {data.batches.map((batch) => (
                    <div key={batch.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{batch.sourceSheetName || t("contentSync.grammar.batchSync.untitledBatch")}</p>
                          <Badge variant={batch.status === "completed" ? "success" : batch.status === "failed" ? "warning" : "secondary"}>
                            {batch.status === "completed"
                              ? t("contentSync.status.batch.completed")
                              : batch.status === "failed"
                                ? t("contentSync.status.batch.failed")
                                : t("contentSync.status.batch.pending")}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{batch.sourceDocumentId || t("contentSync.grammar.batchSync.noSpreadsheetId")}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t("contentSync.grammar.batchSync.historySummary", {
                            rows: data.batchRowCounts.get(batch.id) ?? 0,
                            pending: batch.pendingRows,
                            approved: batch.approvedRows,
                            applied: batch.appliedRows,
                            errors: batch.errorRows,
                          })}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={link(`/admin/content-sync?sync=grammar&batch=${batch.id}`)}>{t("contentSync.grammar.batchSync.openRows")}</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
