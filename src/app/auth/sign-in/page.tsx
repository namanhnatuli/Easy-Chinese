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
    <div className="page-shell mx-auto max-w-5xl">
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Main Action Section */}
        <div className="flex flex-col justify-center space-y-8 py-8 lg:py-12">
          <div className="space-y-6">
            <Badge variant="secondary" className="w-fit rounded-full bg-secondary/50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground ring-1 ring-inset ring-secondary-foreground/10">
              {t("auth.signInBadge")}
            </Badge>
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl lg:leading-[1.1]">
                {t("auth.title")}
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("auth.description")}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-[2.5rem] border border-border/50 bg-card/30 p-6 shadow-sm backdrop-blur-sm sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 w-full rounded-2xl px-8 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-fit">
                <Link href={googleHref}>
                  {t("auth.continueWithGoogle")}
                  <ArrowRight className="ml-2 size-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 w-full rounded-2xl px-8 text-base font-semibold transition-all hover:bg-accent/50 sm:w-fit">
                <Link href={link("/lessons")}>{t("auth.continueAnonymously")}</Link>
              </Button>
            </div>
            <p className="text-sm leading-6 text-muted-foreground/80">
              {t("auth.anonymousVisitors")}
            </p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="lg:py-12">
          <Card className="h-full border-border/40 bg-card/50 shadow-soft backdrop-blur-md">
            <CardHeader className="space-y-4 p-8 sm:p-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/80">
                {t("auth.whySignIn")}
              </p>
              <CardTitle className="text-2xl font-bold leading-snug tracking-tight text-foreground">
                {t("auth.sideTitle")}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                {t("auth.sideDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 px-8 pb-10 sm:px-10">
              {reasonCards.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.key}
                    className="group relative overflow-hidden rounded-3xl border border-border/50 bg-background/50 p-5 transition-all hover:border-primary/20 hover:bg-background/80"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary transition-colors group-hover:bg-primary/10">
                        <Icon className="size-6" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-base font-bold text-foreground">{item.title}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground/90">{item.description}</p>
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
