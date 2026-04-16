import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TopicForm } from "@/components/admin/topic-form";
import { deleteTopicAction, getTopicById, listTopics, saveTopicAction } from "@/features/admin/topics";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminTopicsPage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string }>;
}) {
  await requireAdminUser();
  const params = (await searchParams) ?? {};
  const [topics, editingTopic] = await Promise.all([
    listTopics(),
    params.edit ? getTopicById(params.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Topics"
        title="Topics"
        description="Manage content categories used by words and lessons."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Slug</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topics.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                      No topics yet.
                    </td>
                  </tr>
                ) : (
                  topics.map((topic) => (
                    <tr key={topic.id}>
                      <td className="px-5 py-4 font-semibold text-slate-950">{topic.name}</td>
                      <td className="px-5 py-4 text-slate-600">{topic.slug}</td>
                      <td className="px-5 py-4 text-slate-600">{topic.description ?? "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-3">
                          <Link
                            href={`/admin/topics?edit=${topic.id}`}
                            className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
                          >
                            Edit
                          </Link>
                          <form action={deleteTopicAction}>
                            <input type="hidden" name="id" value={topic.id} />
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

        <TopicForm
          action={saveTopicAction}
          initialValue={editingTopic}
          submitLabel={editingTopic ? "Save topic" : "Create topic"}
        />
      </div>
    </div>
  );
}
