import { requirePermission } from "@/lib/auth";

export default async function SettingsPage() {
  await requirePermission("settings.read");

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Settings shell</h1>
        <p className="mt-2 text-sm text-slate-600">
          This route is now protected for authenticated users. Full preference management still
          belongs to phase 8.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-950">Planned preferences</h2>
          <p className="mt-2 text-sm text-slate-600">
            Language, theme, and font controls.
          </p>
        </article>
        <article className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-950">Blocked until later phases</h2>
          <p className="mt-2 text-sm text-slate-600">
            Needs completed auth, profiles, and protected route behavior.
          </p>
        </article>
      </section>
    </div>
  );
}
