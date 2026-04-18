"use client";

import { RouteErrorState } from "@/components/shared/route-error-state";

export default function ReviewError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorState
      title="Review queue could not be loaded"
      description="There was a problem reading the due review items for your account."
      reset={reset}
    />
  );
}
