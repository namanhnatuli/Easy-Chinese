import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdminUser } from "@/lib/auth";

const adminSections = [
  {
    href: "/admin/words",
    title: "Words",
    description: "Manage vocabulary, examples, publish state, and taxonomy links.",
  },
  {
    href: "/admin/grammar",
    title: "Grammar Points",
    description: "Create grammar explanations, examples, and publishable lesson content.",
  },
  {
    href: "/admin/lessons",
    title: "Lessons",
    description: "Compose ordered lesson content from words and grammar points.",
  },
  {
    href: "/admin/topics",
    title: "Topics",
    description: "Maintain lesson categories and content organization.",
  },
  {
    href: "/admin/radicals",
    title: "Radicals",
    description: "Maintain Chinese radical reference data for vocabulary entries.",
  },
];

export default async function AdminPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin"
        title="Content management"
        description="Phase 4 adds admin-only content CRUD on top of the existing schema, auth model, and RLS rules."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {adminSections.map((section) => (
          <Card key={section.href} className="border-border/80 transition hover:border-primary/30">
            <CardContent className="p-6">
              <Link href={section.href} className="block">
                <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
