import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RadicalForm } from "@/components/admin/radical-form";
import {
  deleteRadicalAction,
  getRadicalById,
  listRadicals,
  saveRadicalAction,
} from "@/features/admin/radicals";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminRadicalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string }>;
}) {
  await requireAdminUser();
  const params = (await searchParams) ?? {};
  const [radicals, editingRadical] = await Promise.all([
    listRadicals(),
    params.edit ? getRadicalById(params.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Radicals"
        title="Radicals"
        description="Manage radical reference data used by vocabulary entries."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Radical</th>
                  <th className="px-5 py-3 font-medium">Pinyin</th>
                  <th className="px-5 py-3 font-medium">Meaning</th>
                  <th className="px-5 py-3 font-medium">Strokes</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {radicals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                      No radicals yet.
                    </td>
                  </tr>
                ) : (
                  radicals.map((radical) => (
                    <tr key={radical.id}>
                      <td className="px-5 py-4 text-lg font-semibold text-slate-950">
                        {radical.radical}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{radical.pinyin ?? "—"}</td>
                      <td className="px-5 py-4 text-slate-600">{radical.meaning_vi}</td>
                      <td className="px-5 py-4 text-slate-700">{radical.stroke_count}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-3">
                          <Link
                            href={`/admin/radicals?edit=${radical.id}`}
                            className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
                          >
                            Edit
                          </Link>
                          <form action={deleteRadicalAction}>
                            <input type="hidden" name="id" value={radical.id} />
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

        <RadicalForm
          action={saveRadicalAction}
          initialValue={editingRadical}
          submitLabel={editingRadical ? "Save radical" : "Create radical"}
        />
      </div>
    </div>
  );
}
