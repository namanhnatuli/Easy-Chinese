import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/dashboard");
  }

  const { next } = await searchParams;
  const googleHref = next
    ? `/auth/sign-in/google?next=${encodeURIComponent(next)}`
    : "/auth/sign-in/google";

  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Sign In
        </p>
        <h1 className="text-3xl font-semibold text-slate-950">Save your Chinese learning progress</h1>
        <p className="text-sm text-slate-600">
          Continue with Google to create or refresh your learner profile and unlock protected pages
          like Dashboard and Settings.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <Link
          href={googleHref}
          className="block w-full rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white"
        >
          Continue with Google
        </Link>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p>Anonymous visitors can still browse public lessons without signing in.</p>
        <Link href="/lessons" className="mt-3 inline-flex font-medium text-slate-900 underline">
          Continue anonymously instead
        </Link>
      </div>
    </div>
  );
}
