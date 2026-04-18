"use client";

import { RouteErrorState } from "@/components/shared/route-error-state";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorState
      title="Dashboard data could not be loaded"
      description="There was a problem reading your saved progress and review stats."
      reset={reset}
    />
  );
}
