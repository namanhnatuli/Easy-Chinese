"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Eye, Loader2 } from "lucide-react";

import {
  ApplyStatusBadge,
  ChangeTypeBadge,
  ReviewStatusBadge,
} from "@/components/admin/content-sync-status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TablePaginationControls } from "@/components/shared/table-pagination-controls";
import type { VocabSyncRow } from "@/features/vocabulary-sync/types";
import type { ContentSyncFilters } from "@/features/admin/content-sync-utils";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

interface ContentSyncReviewModuleProps {
  rows: VocabSyncRow[];
  batchId: string;
  filters: ContentSyncFilters;
  bulkAction: any; // Server action
  approveAllAction: any;
}

export function ContentSyncReviewModule({
  rows,
  batchId,
  filters,
  bulkAction,
  approveAllAction,
}: ContentSyncReviewModuleProps) {
  const { t, link } = useI18n();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const page = filters.page;
  const pageSize = filters.pageSize;
  
  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setPageSize = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", String(newPageSize));
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [isPending, startTransition] = useTransition();
  const showSelectionControls = filters.view === "queue" || filters.view === "resolved";

  // Rows that can actually be selected for review or apply
  const selectableRows = useMemo(() => {
    if (!showSelectionControls) {
      return [];
    }

    if (filters.view === "resolved") {
      return rows.filter(
        (row) =>
          row.reviewStatus === "approved" &&
          row.applyStatus !== "applied" &&
          row.applyStatus !== "skipped"
      );
    }

    return rows.filter(
      (row) =>
        row.changeClassification !== "invalid" &&
        row.reviewStatus !== "approved" &&
        row.reviewStatus !== "rejected" &&
        row.reviewStatus !== "applied" &&
        row.applyStatus !== "applied" &&
        row.applyStatus !== "skipped",
    );
  }, [rows, showSelectionControls, filters.view]);

  const allSelected = selectableRows.length > 0 && selectedIds.size === selectableRows.length;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  // Removed auto-pagination to target index to prevent infinite loops with router.push

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const selectableRowsOnPage = useMemo(() => {
    if (!showSelectionControls) {
      return [];
    }
    const selectableSet = new Set(selectableRows.map(r => r.id));
    return paginatedRows.filter(r => selectableSet.has(r.id));
  }, [paginatedRows, selectableRows, showSelectionControls]);

  const allOnPageSelected = selectableRowsOnPage.length > 0 && selectableRowsOnPage.every(r => selectedIds.has(r.id));
  const someOnPageSelected = selectableRowsOnPage.some(r => selectedIds.has(r.id)) && !allOnPageSelected;

  const toggleAll = () => {
    if (allOnPageSelected) {
      const next = new Set(selectedIds);
      selectableRowsOnPage.forEach((r) => next.delete(r.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      selectableRowsOnPage.forEach((r) => next.add(r.id));
      setSelectedIds(next);
    }
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkAction = (formData: FormData) => {
    startTransition(async () => {
      await bulkAction(formData);
      setSelectedIds(new Set());
    });
  };

  const handleApproveAllAction = (formData: FormData) => {
    startTransition(async () => {
      await approveAllAction(formData);
      setSelectedIds(new Set());
    });
  };

  return (
    <div className="space-y-4 relative">
      {isPending && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="mt-2 text-sm font-medium text-foreground">Processing...</p>
        </div>
      )}
      {/* Floating Bottom Bulk Action Bar */}
      {showSelectionControls && selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex animate-in fade-in slide-in-from-bottom-4 items-center justify-between rounded-2xl border border-primary/20 bg-background/90 p-4 shadow-2xl backdrop-blur-md max-w-[calc(100vw-2rem)] w-full sm:w-auto gap-8">
          <div className="flex items-center gap-3 whitespace-nowrap">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {selectedIds.size}
            </div>
            <p className="hidden sm:block text-sm font-medium text-foreground">
              {selectedIds.size === 1
                ? t("contentSync.queue.selectedSingle")
                : t("contentSync.queue.selectedMultiple", { count: selectedIds.size })}
            </p>
          </div>

          <form action={handleBulkAction} className="flex items-center gap-2">
            <input type="hidden" name="batch_id" value={batchId} />
            <input type="hidden" name="return_view" value={filters.view} />
            <input type="hidden" name="return_q" value={filters.q} />
            <input type="hidden" name="return_change_type" value={filters.changeType} />
            <input type="hidden" name="return_review_status" value={filters.reviewStatus} />
            <input type="hidden" name="return_apply_status" value={filters.applyStatus} />
            <input type="hidden" name="return_page" value={page} />
            <input type="hidden" name="return_page_size" value={pageSize} />
            
            {Array.from(selectedIds).map((id) => (
              <input key={id} type="hidden" name="selected_row_ids" value={id} />
            ))}

            {filters.view === "resolved" ? (
              <Button type="submit" size="sm">
                {t("contentSync.queue.bulkApply")}
              </Button>
            ) : (
              <>
                <Button type="submit" name="decision" value="approve" size="sm">
                  {t("contentSync.queue.bulkApprove")}
                </Button>
                <Button type="submit" name="decision" value="reject" variant="outline" size="sm">
                  {t("contentSync.queue.bulkReject")}
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Cancel
            </Button>
          </form>
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-2xl border border-border/80 bg-card/95 overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            title={t("contentSync.empty.noFilteredRows")}
            description={t("contentSync.empty.noFilteredRowsDescription")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {showSelectionControls ? (
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPageSelected;
                      }}
                      onChange={toggleAll}
                      className="size-4 rounded border-border text-primary focus-ring"
                    />
                  </TableHead>
                ) : null}
                <TableHead>{t("contentSync.queue.text")}</TableHead>
                <TableHead>{t("contentSync.queue.change")}</TableHead>
                <TableHead>{t("contentSync.queue.review")}</TableHead>
                <TableHead>{t("contentSync.queue.apply")}</TableHead>
                <TableHead>{t("contentSync.queue.batch")}</TableHead>
                <TableHead>{t("contentSync.queue.source")}</TableHead>
                <TableHead className="text-right">{t("contentSync.queue.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row) => {
                const isSelected = selectedIds.has(row.id);
                const isSelectable = filters.view === "resolved"
                  ? row.reviewStatus === "approved" &&
                    row.applyStatus !== "applied" &&
                    row.applyStatus !== "skipped"
                  : row.changeClassification !== "invalid" &&
                    row.reviewStatus !== "approved" &&
                    row.reviewStatus !== "rejected" &&
                    row.reviewStatus !== "applied" &&
                    row.applyStatus !== "applied" &&
                    row.applyStatus !== "skipped";

                const payload = (row.adminEditedPayload ?? row.normalizedPayload) as Record<string, any>;
                const normalizedText = payload.normalizedText || "???";
                const pinyin = payload.pinyin || "";
                
                // URL for the detail modal
                const rowParams = new URLSearchParams();
                if (filters.q) rowParams.set("q", filters.q);
                if (filters.changeType !== "all") rowParams.set("changeType", filters.changeType);
                if (filters.reviewStatus !== "all") rowParams.set("reviewStatus", filters.reviewStatus);
                if (filters.applyStatus !== "all") rowParams.set("applyStatus", filters.applyStatus);
                if (filters.view !== "queue") rowParams.set("view", filters.view);
                if (batchId) rowParams.set("batch", batchId);
                rowParams.set("row", row.id);
                const rowHref = link(`/admin/content-sync?${rowParams.toString()}`);

                return (
                  <TableRow 
                    key={row.id} 
                    className={cn(isSelected && "bg-primary/5")}
                  >
                    {showSelectionControls ? (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!isSelectable}
                          onChange={() => toggleRow(row.id)}
                          className="size-4 rounded border-border text-primary focus-ring disabled:opacity-30"
                        />
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <div className="font-chinese text-xl font-semibold text-foreground">{normalizedText}</div>
                      <div className="text-xs text-muted-foreground">{pinyin}</div>
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
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <span className="block max-w-[140px] truncate" title={row.batchId}>
                        {row.batchId}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      #{row.sourceRowNumber ?? t("common.notAvailable")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm" className="gap-2">
                        <Link href={rowHref}>
                          <Eye className="size-3.5" />
                          {t("contentSync.queue.detail")}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <TablePaginationControls
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          totalItems={rows.length}
          itemLabel={t("contentSync.queue.rowsLabel")}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
          }}
        />
      </div>

      {/* Overall Actions Bar (Global) */}
      {showSelectionControls ? (
        <div className="flex justify-end pt-2">
          <form action={handleApproveAllAction} className="flex gap-3">
            <input type="hidden" name="batch_id" value={batchId} />
            <input type="hidden" name="return_view" value={filters.view} />
            <input type="hidden" name="return_q" value={filters.q} />
            <input type="hidden" name="return_change_type" value={filters.changeType} />
            <input type="hidden" name="return_review_status" value={filters.reviewStatus} />
            <input type="hidden" name="return_apply_status" value={filters.applyStatus} />
            <input type="hidden" name="return_page" value={page} />
            <input type="hidden" name="return_page_size" value={pageSize} />
            
            <Button type="submit" variant="outline" size="sm">
              {filters.view === "resolved" ? "Apply all eligible" : "Approve all eligible"}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
