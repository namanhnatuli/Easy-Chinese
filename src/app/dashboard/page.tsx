import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DashboardPage() {
  await requirePermission("dashboard.read");

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Dashboard"
        badge="Authenticated"
        title="Your study progress"
        description="The dashboard now has a stronger visual structure even though live progress metrics still arrive in phase 7."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New" value="0" description="Words not started yet" />
        <StatCard label="Learning" value="0" description="Words currently in active rotation" />
        <StatCard label="Review due" value="0" description="Scheduled review items will appear here" accent="warning" />
        <StatCard label="Mastered" value="0" description="Stable vocabulary and completed drills" accent="success" />
      </section>

      <EmptyState
        title="Progress data is not connected yet"
        description="This dashboard shell now matches the app’s visual system, but real counters and charts still depend on the later progress and review phases."
      />
    </div>
  );
}
