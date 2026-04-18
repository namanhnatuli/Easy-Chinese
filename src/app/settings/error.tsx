"use client";

import { RouteErrorState } from "@/components/shared/route-error-state";

export default function SettingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorState
      title="Settings could not be loaded"
      description="There was a problem reading or preparing your saved preferences."
      reset={reset}
    />
  );
}
