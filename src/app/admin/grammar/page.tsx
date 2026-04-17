import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
          <Button asChild>
            <Link href="/admin/grammar/new">New grammar point</Link>
          </Button>
        }
      />

      {grammarPoints.length === 0 ? (
        <EmptyState title="No grammar points yet" description="Add the first grammar entry to start structuring lessons." />
      ) : (
        <section className="surface-panel overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>HSK</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grammarPoints.map((point) => (
                <TableRow key={point.id}>
                  <TableCell className="font-semibold text-foreground">{point.title}</TableCell>
                  <TableCell className="text-muted-foreground">{point.slug}</TableCell>
                  <TableCell>HSK {point.hsk_level}</TableCell>
                  <TableCell>
                    <Badge variant={point.is_published ? "success" : "warning"}>
                      {point.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(point.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/grammar/${point.id}/edit`}>Edit</Link>
                      </Button>
                      <form action={deleteGrammarAction}>
                        <input type="hidden" name="id" value={point.id} />
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
    </div>
  );
}
