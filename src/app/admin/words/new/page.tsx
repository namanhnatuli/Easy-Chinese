import { requireAdminUser } from "@/lib/auth";

export default async function NewWordPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          New Word
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Create a vocabulary entry</h1>
        <p className="mt-2 text-sm text-slate-600">
          This admin-only route is protected in phase 2. The reusable CRUD form still belongs to
          phase 4.
        </p>
      </section>
      <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-950">Deferred work</h2>
        <p className="mt-2 text-sm text-slate-600">
          Form validation, server actions, and Supabase writes will be implemented after the auth and
          schema phases are complete.
        </p>
      </section>
    </div>
  );
}
