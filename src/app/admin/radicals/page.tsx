import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RadicalForm } from "@/components/admin/radical-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
        {radicals.length === 0 ? (
          <EmptyState title="No radicals yet" description="Create radicals to support richer vocabulary metadata." />
        ) : (
          <section className="surface-panel overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Radical</TableHead>
                  <TableHead>Pinyin</TableHead>
                  <TableHead>Meaning</TableHead>
                  <TableHead>Strokes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {radicals.map((radical) => (
                  <TableRow key={radical.id}>
                    <TableCell className="font-chinese text-2xl font-semibold text-foreground">
                      {radical.radical}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{radical.pinyin ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{radical.meaning_vi}</TableCell>
                    <TableCell>{radical.stroke_count}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/radicals?edit=${radical.id}`}>Edit</Link>
                        </Button>
                        <form action={deleteRadicalAction}>
                          <input type="hidden" name="id" value={radical.id} />
                          <Button type="submit" variant="ghost" size="sm" className="text-rose-600 hover:text-rose-600">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        )}

        <RadicalForm
          action={saveRadicalAction}
          initialValue={editingRadical}
          submitLabel={editingRadical ? "Save radical" : "Create radical"}
        />
      </div>
    </div>
  );
}
