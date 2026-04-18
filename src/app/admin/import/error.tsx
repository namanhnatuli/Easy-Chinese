"use client";

import { RouteErrorState } from "@/components/shared/route-error-state";

export default function AdminImportError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <RouteErrorState
      title="Import page unavailable"
      description="The import tools could not be loaded. Try again or return to the admin vocabulary library."
      reset={reset}
    />
  );
}
