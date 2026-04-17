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
      title="Lessons could not be loaded"
      description="A problem occurred while fetching published lesson content."
      reset={reset}
    />
  );
}
