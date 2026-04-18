"use client";

import { RouteErrorState } from "@/components/shared/route-error-state";
import { useI18n } from "@/i18n/client";

export default function AdminImportError({
  reset,
}: {
  reset: () => void;
}) {
  const { t } = useI18n();

  return (
    <RouteErrorState
      title={t("errors.adminImportTitle")}
      description={t("errors.adminImportDescription")}
      reset={reset}
    />
  );
}
