"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePaginationControls } from "@/components/shared/table-pagination-controls";
import type { VocabSyncBatch } from "@/features/vocabulary-sync/types";
import { useI18n } from "@/i18n/client";

interface ContentSyncBatchHistoryTableProps {
  batches: VocabSyncBatch[];
  batchRowCounts: Record<string, number>;
  activeBatchId: string | null;
  selectedBatchId: string | null;
}

export function ContentSyncBatchHistoryTable({
  batches,
  batchRowCounts,
  activeBatchId,
  selectedBatchId,
}: ContentSyncBatchHistoryTableProps) {
  const { t, link } = useI18n();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pageCount = Math.max(1, Math.ceil(batches.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!selectedBatchId) {
      return;
    }

    const targetIndex = batches.findIndex((batch) => batch.id === selectedBatchId);
    if (targetIndex === -1) {
      return;
    }

    setPage(Math.floor(targetIndex / pageSize) + 1);
  }, [selectedBatchId, batches, pageSize]);

  const paginatedBatches = useMemo(() => {
    const start = (page - 1) * pageSize;
    return batches.slice(start, start + pageSize);
  }, [batches, page, pageSize]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t("contentSync.batchHistory.sheet")}</TableHead>
            <TableHead>{t("contentSync.batchHistory.spreadsheet")}</TableHead>
            <TableHead>{t("contentSync.batchHistory.status")}</TableHead>
            <TableHead>{t("contentSync.batchHistory.syncedRows")}</TableHead>
            <TableHead>{t("contentSync.batchHistory.pending")}</TableHead>
            <TableHead>{t("contentSync.batchHistory.approved")}</TableHead>
            <TableHead>{t("contentSync.batchHistory.applied")}</TableHead>
            <TableHead>{t("contentSync.batchHistory.rejected")}</TableHead>
            <TableHead>{t("contentSync.batchHistory.errors")}</TableHead>
            <TableHead>{t("contentSync.batchHistory.created")}</TableHead>
            <TableHead className="text-right">{t("contentSync.batchHistory.action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedBatches.map((batch) => {
            const active = batch.id === activeBatchId;

            return (
              <TableRow key={batch.id} className={active ? "bg-primary/5" : undefined}>
                <TableCell>
                  <div className="min-w-0">
                    <div className="font-medium">{batch.sourceSheetName || t("contentSync.batchHistory.untagged")}</div>
                  </div>
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                  {batch.sourceDocumentId || t("contentSync.batchHistory.notAvailable")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      batch.status === "completed"
                        ? "success"
                        : batch.status === "failed"
                          ? "warning"
                        : "secondary"
                    }
                  >
                    {batch.status === "completed"
                      ? t("contentSync.status.batch.completed")
                      : batch.status === "failed"
                        ? t("contentSync.status.batch.failed")
                        : t("contentSync.status.batch.pending")}
                  </Badge>
                </TableCell>
                <TableCell>{batchRowCounts[batch.id] ?? 0}</TableCell>
                <TableCell>{batch.pendingRows}</TableCell>
                <TableCell>{batch.approvedRows}</TableCell>
                <TableCell>{batch.appliedRows}</TableCell>
                <TableCell>{batch.rejectedRows}</TableCell>
                <TableCell>{batch.errorRows}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {batch.createdAt ? new Date(batch.createdAt).toLocaleString() : t("contentSync.batchHistory.unknown")}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={link(`/admin/content-sync?viewBatch=${batch.id}${selectedBatchId ? `&batch=${selectedBatchId}` : ""}`)}>
                      {t("contentSync.batchHistory.view")}
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <TablePaginationControls
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        totalItems={batches.length}
        itemLabel={t("contentSync.batchHistory.batchesLabel")}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
      />
    </div>
  );
}
