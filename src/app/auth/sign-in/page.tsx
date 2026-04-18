import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getServerI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { t, link } = await getServerI18n();

  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/dashboard");
  }

  const { next } = await searchParams;
  const googleHref = next
    ? `${link("/auth/sign-in/google")}?next=${encodeURIComponent(next)}`
    : link("/auth/sign-in/google");

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="overflow-hidden border-border/80">
        <CardContent className="p-8 sm:p-10">
          <div className="space-y-4">
            <Badge variant="secondary">{t("auth.signInBadge")}</Badge>
            <h1 className="text-4xl font-semibold">{t("auth.title")}</h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              {t("auth.description")}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <Button asChild size="lg" className="w-full sm:w-fit">
              <Link href={googleHref}>
                {t("auth.continueWithGoogle")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("auth.anonymousVisitors")}
            </p>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-fit">
              <Link href={link("/lessons")}>{t("auth.continueAnonymously")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-slate-950 text-white">
        <CardContent className="p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("auth.whySignIn")}</p>
          <div className="mt-6 space-y-4">
            {[
              t("auth.reasons.dashboard"),
              t("auth.reasons.progress"),
              t("auth.reasons.routing"),
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
