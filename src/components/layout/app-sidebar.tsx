import Link from "next/link";

import type { AuthUser } from "@/types/domain";

interface SidebarLink {
  href: string;
  label: string;
  description: string;
}

const publicLinks: SidebarLink[] = [
  { href: "/", label: "Home", description: "Overview and study path" },
  { href: "/lessons", label: "Lessons", description: "Browse structured learning" },
];

const authenticatedLinks: SidebarLink[] = [
  { href: "/dashboard", label: "Dashboard", description: "Your saved progress" },
  { href: "/settings", label: "Settings", description: "Preferences and account" },
];

const adminLinks: SidebarLink[] = [
  { href: "/admin", label: "Admin", description: "Content management" },
  { href: "/admin/words", label: "Words", description: "Vocabulary library" },
];

function NavList({
  title,
  links,
}: {
  title: string;
  links: SidebarLink[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        {title}
      </p>
      <div className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-2xl border border-transparent px-3 py-3 transition hover:border-slate-200 hover:bg-white"
          >
            <p className="text-sm font-medium text-slate-900">{link.label}</p>
            <p className="text-xs text-slate-500">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AppSidebar({ user }: { user: AuthUser | null }) {
  return (
    <aside className="w-full rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm lg:sticky lg:top-6 lg:h-fit lg:max-w-xs">
      <div className="mb-6 space-y-2">
        <div className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Chinese Learning
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-950">Study calmly, daily</h1>
          <p className="text-sm text-slate-600">
            Lessons, drills, and progress in one focused workspace.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <NavList title="Explore" links={publicLinks} />

        {user ? <NavList title="Account" links={authenticatedLinks} /> : null}

        {user?.role === "admin" ? <NavList title="Manage" links={adminLinks} /> : null}
      </div>
    </aside>
  );
}
