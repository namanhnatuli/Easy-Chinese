import { requireAdminUser } from "@/lib/auth";
import { WordImportForm } from "@/components/admin/word-import-form";

export default async function AdminImportPage() {
  await requireAdminUser();

  return <WordImportForm />;
}
