import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteLessonAction, listLessons } from "@/features/admin/lessons";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminLessonsPage() {
  await requireAdminUser();
  const lessons = await listLessons();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Lessons"
        title="Lessons"
        description="Manage publishable lessons and compose ordered words and grammar points."
        actions={
          <Button asChild>
            <Link href="/admin/lessons/new">New lesson</Link>
          </Button>
        }
      />

      {lessons.length === 0 ? (
        <EmptyState title="No lessons yet" description="Create a lesson to start attaching ordered vocabulary and grammar points." />
      ) : (
        <section className="surface-panel overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Lesson</TableHead>
                <TableHead>HSK</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((lesson) => (
                <TableRow key={lesson.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{lesson.title}</div>
                    <div className="text-sm text-muted-foreground">{lesson.slug}</div>
                  </TableCell>
                  <TableCell>HSK {lesson.hsk_level}</TableCell>
                  <TableCell>{lesson.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={lesson.is_published ? "success" : "warning"}>
                      {lesson.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(lesson.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/lessons/${lesson.id}/edit`}>Edit</Link>
                      </Button>
                      <form action={deleteLessonAction}>
                        <input type="hidden" name="id" value={lesson.id} />
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
