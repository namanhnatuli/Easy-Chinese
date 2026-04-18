"use client";

import { RouteErrorState } from "@/components/shared/route-error-state";
import { useI18n } from "@/i18n/client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  return (
    <RouteErrorState
      title={t("errors.dashboardTitle")}
      description={t("errors.dashboardDescription")}
      reset={reset}
    />
  );
}
