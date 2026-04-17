import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="overflow-hidden border-border/80">
        <CardContent className="p-8 sm:p-10">
          <div className="space-y-4">
            <Badge variant="secondary">Sign in</Badge>
            <h1 className="text-4xl font-semibold">Save progress without losing the public-first browsing flow</h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Continue with Google to create or refresh your learner profile, unlock protected pages like Dashboard and Settings, and keep future review progress synced.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <Button asChild size="lg" className="w-full sm:w-fit">
              <Link href={googleHref}>
                Continue with Google
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Anonymous visitors can still browse public lessons and preview the study flow first.
            </p>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-fit">
              <Link href="/lessons">Continue anonymously</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-slate-950 text-white">
        <CardContent className="p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Why sign in</p>
          <div className="mt-6 space-y-4">
            {[
              "Unlock dashboard and settings routes.",
              "Prepare for saved review progress in later phases.",
              "Keep role-based routing consistent for user and admin accounts.",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
