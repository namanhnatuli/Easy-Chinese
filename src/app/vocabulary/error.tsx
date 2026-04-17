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
      title="Vocabulary could not be loaded"
      description="A problem occurred while fetching published vocabulary content."
      reset={reset}
    />
  );
}
