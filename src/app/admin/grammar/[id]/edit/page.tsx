import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GrammarPointForm } from "@/components/admin/grammar-point-form";
import { getGrammarEditor, saveGrammarAction } from "@/features/admin/grammar";
import { requireAdminUser } from "@/lib/auth";

export default async function EditGrammarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminUser();
  const { id } = await params;
  const initialValue = await getGrammarEditor(id);

  if (!initialValue) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Grammar"
        title={`Edit ${initialValue.grammarPoint.title}`}
        description="Update grammar explanations, examples, and publish state."
      />
      <GrammarPointForm
        action={saveGrammarAction}
        initialValue={initialValue}
        submitLabel="Save grammar point"
      />
    </div>
  );
}
