"use client";

import { useRouter } from "next/navigation";
import { History, LayoutPanelLeft, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";

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
import { StatCard } from "@/components/shared/stat-card";
import { useI18n } from "@/i18n/client";
import type { VocabSyncBatch, VocabSyncRow } from "@/features/vocabulary-sync/types";
import type { ContentSyncFilters } from "@/features/admin/content-sync-utils";
import {
  ApplyStatusBadge,
  ChangeTypeBadge,
  ReviewStatusBadge,
} from "@/components/admin/content-sync-status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ContentSyncBatchDialogProps {
  batch: VocabSyncBatch | null;
  filters: ContentSyncFilters;
  rows: VocabSyncRow[];
}

export function ContentSyncBatchDialog({
  batch,
  filters,
  rows,
}: ContentSyncBatchDialogProps) {
  const router = useRouter();
  const { link } = useI18n();

  if (!batch) return null;

  const handleClose = () => {
    const params = new URLSearchParams();
    if (filters.batchId) params.set("batch", filters.batchId);
    if (filters.q) params.set("q", filters.q);
    if (filters.changeType !== "all") params.set("changeType", filters.changeType);
    if (filters.reviewStatus !== "all") params.set("reviewStatus", filters.reviewStatus);
    if (filters.applyStatus !== "all") params.set("applyStatus", filters.applyStatus);
    if (filters.view !== "queue") params.set("view", filters.view);
    
    // Explicitly remove viewBatch by not adding it to params
    router.push(link(`/admin/content-sync?${params.toString()}`));
  };


  return (
    <Dialog open={!!batch} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <History className="size-5" />
            <DialogTitle>Batch sync details</DialogTitle>
          </div>
          <DialogDescription>
            Configuration and current status of the selected vocabulary preview run.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="rounded-2xl border bg-muted/30 p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Source spreadsheet</p>
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium truncate max-w-[240px]">{batch.sourceDocumentId || "N/A"}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Sheet name</p>
                <div className="flex items-center gap-2">
                  <LayoutPanelLeft className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{batch.sourceSheetName || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Created {batch.createdAt ? new Date(batch.createdAt).toLocaleString() : "Unknown"}
                </p>
              </div>
              <Badge variant={batch.status === "completed" ? "success" : batch.status === "failed" ? "destructive" : "secondary"}>
                {batch.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1">Row processing summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard variant="compact" label="Synced rows" value={String(rows.length)} icon={<FileText className="size-4" />} />
              <StatCard variant="compact" label="Pending" value={String(batch.pendingRows)} icon={<Clock className="size-4" />} />
              <StatCard variant="compact" label="Approved" value={String(batch.approvedRows)} icon={<CheckCircle2 className="size-4" />} accent="success" />
              <StatCard variant="compact" label="Applied" value={String(batch.appliedRows)} icon={<CheckCircle2 className="size-4" />} accent="success" />
              <StatCard variant="compact" label="Errors" value={String(batch.errorRows)} icon={<AlertCircle className="size-4" />} accent="destructive" />
              <StatCard variant="compact" label="Rejected" value={String(batch.rejectedRows)} icon={<AlertCircle className="size-4" />} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1">Rows in this batch</p>
            <div className="max-h-[320px] overflow-auto rounded-2xl border">
              {rows.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No sync rows found for this batch.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Text</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Apply</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const payload = (row.adminEditedPayload ?? row.normalizedPayload) as Record<string, unknown>;
                      const normalizedText =
                        typeof payload.normalizedText === "string" && payload.normalizedText.length > 0
                          ? payload.normalizedText
                          : row.sourceRowKey;

                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            #{row.sourceRowNumber ?? "-"}
                          </TableCell>
                          <TableCell>
                            <div className="font-chinese text-lg font-semibold">{normalizedText}</div>
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
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} className="w-full sm:w-auto">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
