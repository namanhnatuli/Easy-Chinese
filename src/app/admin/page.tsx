import Link from "next/link";

import { requireAdminUser } from "@/lib/auth";

const adminSections = [
  {
    href: "/admin/words",
    title: "Words",
    description: "Phase 4 CRUD workspace placeholder.",
  },
  {
    href: "/admin/words/new",
    title: "New Word",
    description: "Phase 4 form flow placeholder.",
  },
];

export default async function AdminPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Admin shell</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Admin authorization is active in phase 2. CRUD flows remain deferred to phase 4.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {adminSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300"
          >
            <h2 className="text-xl font-semibold text-slate-950">{section.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
