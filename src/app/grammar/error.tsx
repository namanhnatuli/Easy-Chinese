"use client";

import { RouteErrorState } from "@/components/shared/route-error-state";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorState
      title="Grammar content could not be loaded"
      description="A problem occurred while fetching published grammar content."
      reset={reset}
    />
  );
}
