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
      title="The lesson session could not be loaded"
      description="A problem occurred while preparing the learner study experience."
      reset={reset}
    />
  );
}
