"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VocabSyncRow } from "@/features/vocabulary-sync/types";
import { useI18n } from "@/i18n/client";

export function ChangeTypeBadge({ value }: { value: VocabSyncRow["changeClassification"] }) {
  const { t } = useI18n();

  if (value === "new") {
    return <Badge variant="success">{t("contentSync.status.changeType.new")}</Badge>;
  }

  if (value === "changed") {
    return <Badge variant="warning">{t("contentSync.status.changeType.changed")}</Badge>;
  }

  if (value === "unchanged") {
    return <Badge variant="secondary">{t("contentSync.status.changeType.unchanged")}</Badge>;
  }

  return (
    <Badge
      variant="outline"
      className={cn(value === "conflict" && "border-amber-300 bg-amber-50 text-amber-700", value === "invalid" && "border-rose-300 bg-rose-50 text-rose-700")}
    >
      {value === "conflict" ? t("contentSync.status.changeType.conflict") : t("contentSync.status.changeType.invalid")}
    </Badge>
  );
}

export function ReviewStatusBadge({ value }: { value: VocabSyncRow["reviewStatus"] }) {
  const { t } = useI18n();

  if (value === "approved" || value === "applied") {
    return <Badge variant="success">{value === "applied" ? t("contentSync.status.review.applied") : t("contentSync.status.review.approved")}</Badge>;
  }

  if (value === "rejected") {
    return <Badge className="bg-rose-100 text-rose-700">{t("contentSync.status.review.rejected")}</Badge>;
  }

  if (value === "needs_review") {
    return <Badge variant="warning">{t("contentSync.status.review.needsReview")}</Badge>;
  }

  return <Badge variant="secondary">{t("contentSync.status.review.pending")}</Badge>;
}

export function ApplyStatusBadge({ value }: { value: VocabSyncRow["applyStatus"] }) {
  const { t } = useI18n();

  if (value === "applied") {
    return <Badge variant="success">{t("contentSync.status.apply.applied")}</Badge>;
  }

  if (value === "skipped") {
    return <Badge variant="secondary">{t("contentSync.status.apply.skipped")}</Badge>;
  }

  if (value === "failed") {
    return <Badge className="bg-rose-100 text-rose-700">{t("contentSync.status.apply.failed")}</Badge>;
  }

  return <Badge variant="outline">{t("contentSync.status.apply.pending")}</Badge>;
}
