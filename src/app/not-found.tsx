import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Not found"
        badge="Route missing"
        title="This page does not exist"
        description="The address may be outdated, unpublished, or mistyped. Return to the lesson library or head back to the main workspace."
      />

      <EmptyState
        title="Nothing to show here"
        description="Try a published lesson, dashboard, or home page instead."
        visual={<Compass className="size-10 text-muted-foreground" aria-hidden="true" />}
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/">
                <Home className="size-4" />
                Home
              </Link>
            </Button>
            <Button asChild>
              <Link href="/lessons">
                <Search className="size-4" />
                Browse lessons
              </Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
