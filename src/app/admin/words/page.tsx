import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/admin/import">Import words</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/words/new">New word</Link>
            </Button>
          </div>
        }
      />

      {words.length === 0 ? (
        <EmptyState title="No words yet" description="Create the first vocabulary entry to start building the library." />
      ) : (
        <section className="surface-panel overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Word</TableHead>
                <TableHead>Meaning</TableHead>
                <TableHead>HSK</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {words.map((word) => (
                <TableRow key={word.id}>
                  <TableCell>
                    <div className="font-chinese text-2xl font-semibold text-foreground">{word.hanzi}</div>
                    <div className="text-sm text-muted-foreground">
                      {word.pinyin} · {word.slug}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{word.vietnamese_meaning}</TableCell>
                  <TableCell>HSK {word.hsk_level}</TableCell>
                  <TableCell>
                    <Badge variant={word.is_published ? "success" : "warning"}>
                      {word.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(word.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/words/${word.id}/edit`}>Edit</Link>
                      </Button>
                      <form action={deleteWordAction}>
                        <input type="hidden" name="id" value={word.id} />
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
