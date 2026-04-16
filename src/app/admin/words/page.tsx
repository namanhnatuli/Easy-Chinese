import Link from "next/link";

import { requireAdminUser } from "@/lib/auth";

export default async function AdminWordsPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Admin Words
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Vocabulary management shell</h1>
          <p className="mt-2 text-sm text-slate-600">
            This admin-only route is protected in phase 2. The table structure itself remains
            deferred until phase 4.
          </p>
        </div>

        <Link
          href="/admin/words/new"
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          New word
        </Link>
      </section>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-950">Phase 4 deliverables</h2>
        <p className="mt-2 text-sm text-slate-600">
          Word list table, publish state, filtering, and edit actions will be added after content
          schema and role enforcement are complete.
        </p>
      </section>
    </div>
  );
}
