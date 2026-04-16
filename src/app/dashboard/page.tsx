import { requirePermission } from "@/lib/auth";

export default async function DashboardPage() {
  await requirePermission("dashboard.read");

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Progress dashboard shell</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          This route is now protected for authenticated users. Real dashboard statistics still belong
          to phase 7.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-950">Planned for phase 7</h2>
          <p className="mt-2 text-sm text-slate-600">
            New, learning, review due, mastered, and lesson completion counters.
          </p>
        </article>
        <article className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-950">Dependency</h2>
          <p className="mt-2 text-sm text-slate-600">
            Requires completed auth, content schema, and persisted progress layers first.
          </p>
        </article>
      </section>
    </div>
  );
}
