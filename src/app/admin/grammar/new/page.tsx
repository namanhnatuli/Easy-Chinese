import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GrammarPointForm } from "@/components/admin/grammar-point-form";
import { saveGrammarAction } from "@/features/admin/grammar";
import { requireAdminUser } from "@/lib/auth";

export default async function NewGrammarPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Grammar"
        title="New grammar point"
        description="Create a grammar explanation with examples and publish controls."
      />
      <GrammarPointForm action={saveGrammarAction} submitLabel="Create grammar point" />
    </div>
  );
}
