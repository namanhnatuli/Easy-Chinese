import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { WordForm } from "@/components/admin/word-form";
import { listWordFormOptions, saveWordAction } from "@/features/admin/words";
import { requireAdminUser } from "@/lib/auth";

export default async function NewWordPage() {
  await requireAdminUser();
  const { topics, radicals } = await listWordFormOptions();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Words"
        title="New word"
        description="Create a vocabulary entry with optional taxonomy links and attached examples."
      />
      <WordForm
        action={saveWordAction}
        topics={topics}
        radicals={radicals}
        submitLabel="Create word"
      />
    </div>
  );
}
