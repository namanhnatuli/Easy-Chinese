import Link from "next/link";

import type { AuthUser } from "@/types/domain";

export function AppHeader({ user }: { user: AuthUser | null }) {
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Study Workspace
        </p>
        <h2 className="text-xl font-semibold text-slate-950">
          {user ? `Welcome back, ${user.displayName ?? "learner"}` : "Learn Chinese at your own pace"}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/lessons"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Browse lessons
        </Link>

        {user ? (
          <>
            <Link
              href={user.role === "admin" ? "/admin" : "/dashboard"}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {user.role === "admin" ? "Admin workspace" : "Dashboard"}
            </Link>
            <Link
              href="/auth/sign-out"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Sign out
            </Link>
          </>
        ) : (
          <Link
            href="/auth/sign-in"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
