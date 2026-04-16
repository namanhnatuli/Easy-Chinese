import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { deleteGrammarAction, listGrammarPoints } from "@/features/admin/grammar";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminGrammarPage() {
  await requireAdminUser();
  const grammarPoints = await listGrammarPoints();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Grammar"
        title="Grammar points"
        description="Manage explanations, publish state, and example sentences for grammar content."
        actions={
          <Link
            href="/admin/grammar/new"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            New grammar point
          </Link>
        }
      />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Slug</th>
                <th className="px-5 py-3 font-medium">HSK</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grammarPoints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No grammar points yet.
                  </td>
                </tr>
              ) : (
                grammarPoints.map((point) => (
                  <tr key={point.id}>
                    <td className="px-5 py-4 font-semibold text-slate-950">{point.title}</td>
                    <td className="px-5 py-4 text-slate-600">{point.slug}</td>
                    <td className="px-5 py-4 text-slate-700">HSK {point.hsk_level}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          point.is_published
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {point.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(point.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/admin/grammar/${point.id}/edit`}
                          className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
                        >
                          Edit
                        </Link>
                        <form action={deleteGrammarAction}>
                          <input type="hidden" name="id" value={point.id} />
                          <button
                            type="submit"
                            className="text-sm font-medium text-rose-600 underline-offset-4 hover:underline"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
