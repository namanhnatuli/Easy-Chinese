import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { WordForm } from "@/components/admin/word-form";
import { getWordEditor, listWordFormOptions, saveWordAction } from "@/features/admin/words";
import { requireAdminUser } from "@/lib/auth";

export default async function EditWordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminUser();
  const { id } = await params;
  const [initialValue, options] = await Promise.all([getWordEditor(id), listWordFormOptions()]);

  if (!initialValue) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Words"
        title={`Edit ${initialValue.word.hanzi}`}
        description="Update vocabulary details, publish state, and examples."
      />
      <WordForm
        action={saveWordAction}
        topics={options.topics}
        radicals={options.radicals}
        initialValue={initialValue}
        submitLabel="Save word"
      />
    </div>
  );
}
