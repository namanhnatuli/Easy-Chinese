import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LayoutDashboard, RotateCcw, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const reasonCards = [
    {
      key: "dashboard",
      icon: LayoutDashboard,
      title: t("auth.reasonCards.dashboardTitle"),
      description: t("auth.reasonCards.dashboardDescription"),
    },
    {
      key: "progress",
      icon: RotateCcw,
      title: t("auth.reasonCards.progressTitle"),
      description: t("auth.reasonCards.progressDescription"),
    },
    {
      key: "routing",
      icon: ShieldCheck,
      title: t("auth.reasonCards.routingTitle"),
      description: t("auth.reasonCards.routingDescription"),
    },
  ];

  return (
    <div className="page-shell mx-auto max-w-6xl">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <Card className="overflow-hidden border-border/80 bg-card/95 shadow-soft">
          <CardContent className="flex h-full flex-col gap-8 p-8 sm:p-10 lg:p-12">
            <div className="space-y-5">
              <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm font-semibold">
                {t("auth.signInBadge")}
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
                  {t("auth.title")}
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                  {t("auth.description")}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {reasonCards.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.key}
                    className="rounded-[1.5rem] border border-border/80 bg-muted/30 p-4"
                  >
                    <span className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-background text-foreground shadow-soft">
                      <Icon className="size-4" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 rounded-[2rem] border border-border/80 bg-background/70 p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="w-full sm:w-fit">
                  <Link href={googleHref}>
                    {t("auth.continueWithGoogle")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-fit">
                  <Link href={link("/lessons")}>{t("auth.continueAnonymously")}</Link>
                </Button>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {t("auth.anonymousVisitors")}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border-border/80 bg-card/95 shadow-soft">
            <CardHeader className="space-y-3 p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {t("auth.whySignIn")}
              </p>
              <CardTitle className="text-3xl leading-tight text-foreground">
                {t("auth.sideTitle")}
              </CardTitle>
              <CardDescription className="text-base leading-7 text-muted-foreground">
                {t("auth.sideDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 px-8 pb-8 sm:px-10 sm:pb-10">
              {reasonCards.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.key}
                    className="rounded-[1.5rem] border border-border/80 bg-background p-5"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
                        <Icon className="size-5" />
                      </span>
                      <div className="space-y-2">
                        <p className="text-base font-semibold text-foreground">{item.title}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
