import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VocabSyncRow } from "@/features/vocabulary-sync/types";

export function ChangeTypeBadge({ value }: { value: VocabSyncRow["changeClassification"] }) {
  if (value === "new") {
    return <Badge variant="success">New</Badge>;
  }

  if (value === "changed") {
    return <Badge variant="warning">Changed</Badge>;
  }

  if (value === "unchanged") {
    return <Badge variant="secondary">Unchanged</Badge>;
  }

  return (
    <Badge
      variant="outline"
      className={cn(value === "conflict" && "border-amber-300 bg-amber-50 text-amber-700", value === "invalid" && "border-rose-300 bg-rose-50 text-rose-700")}
    >
      {value === "conflict" ? "Conflict" : "Invalid"}
    </Badge>
  );
}

export function ReviewStatusBadge({ value }: { value: VocabSyncRow["reviewStatus"] }) {
  if (value === "approved" || value === "applied") {
    return <Badge variant="success">{value === "applied" ? "Applied" : "Approved"}</Badge>;
  }

  if (value === "rejected") {
    return <Badge className="bg-rose-100 text-rose-700">Rejected</Badge>;
  }

  if (value === "needs_review") {
    return <Badge variant="warning">Needs review</Badge>;
  }

  return <Badge variant="secondary">Pending</Badge>;
}

export function ApplyStatusBadge({ value }: { value: VocabSyncRow["applyStatus"] }) {
  if (value === "applied") {
    return <Badge variant="success">Applied</Badge>;
  }

  if (value === "skipped") {
    return <Badge variant="secondary">Skipped</Badge>;
  }

  if (value === "failed") {
    return <Badge className="bg-rose-100 text-rose-700">Failed</Badge>;
  }

  return <Badge variant="outline">Pending apply</Badge>;
}
