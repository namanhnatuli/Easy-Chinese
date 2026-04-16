import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { deleteWordAction, listWords } from "@/features/admin/words";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminWordsPage() {
  await requireAdminUser();
  const words = await listWords();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Words"
        title="Vocabulary"
        description="Create, edit, publish, and organize vocabulary entries with attached examples."
        actions={
          <Link
            href="/admin/words/new"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            New word
          </Link>
        }
      />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Word</th>
                <th className="px-5 py-3 font-medium">Meaning</th>
                <th className="px-5 py-3 font-medium">HSK</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {words.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No words yet.
                  </td>
                </tr>
              ) : (
                words.map((word) => (
                  <tr key={word.id}>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-950">{word.hanzi}</div>
                      <div className="text-slate-500">
                        {word.pinyin} · {word.slug}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{word.vietnamese_meaning}</td>
                    <td className="px-5 py-4 text-slate-700">HSK {word.hsk_level}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          word.is_published
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {word.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(word.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/admin/words/${word.id}/edit`}
                          className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
                        >
                          Edit
                        </Link>
                        <form action={deleteWordAction}>
                          <input type="hidden" name="id" value={word.id} />
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
