import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Sparkles } from "lucide-react";

import { ContentCard } from "@/components/shared/content-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getServerI18n } from "@/i18n/server";
import { sampleLessons } from "@/types/domain";

export default async function HomePage() {
  const { t, link } = await getServerI18n();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("home.eyebrow")}
        badge={t("home.badge")}
        title={t("home.title")}
        description={t("home.description")}
        actions={
          <>
            <Button asChild size="lg">
              <Link href={link("/lessons")}>
                {t("home.exploreLessons")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={link("/auth/sign-in")}>{t("home.signInForSavedProgress")}</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label={t("home.stats.modesLabel")}
          value="3"
          description={t("home.stats.modesDescription")}
          icon={<Sparkles className="size-5 text-primary" />}
        />
        <StatCard
          label={t("home.stats.structureLabel")}
          value={t("home.stats.structureValue")}
          description={t("home.stats.structureDescription")}
          icon={<BookOpen className="size-5 text-primary" />}
          accent="success"
        />
        <StatCard
          label={t("home.stats.toneLabel")}
          value={t("home.stats.toneValue")}
          description={t("home.stats.toneDescription")}
          icon={<GraduationCap className="size-5 text-white" />}
          accent="dark"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden border-border/80">
          <CardContent className="grid gap-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{t("home.studyPath.badge")}</Badge>
              <Badge variant="warning">{t("home.studyPath.anonymousBadge")}</Badge>
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{t("home.studyPath.title")}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {t("home.studyPath.description")}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                [t("home.studyPath.browseTitle"), t("home.studyPath.browseBody")],
                [t("home.studyPath.practiceTitle"), t("home.studyPath.practiceBody")],
                [t("home.studyPath.reviewTitle"), t("home.studyPath.reviewBody")],
              ].map(([title, body]) => (
                <div key={title} className="rounded-[1.5rem] bg-muted/60 p-4">
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/80 bg-slate-950 text-white">
          <CardContent className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {t("home.focusPanel.eyebrow")}
            </p>
            <h2 className="mt-4 text-2xl font-semibold">{t("home.focusPanel.title")}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {t("home.focusPanel.description")}
            </p>
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{t("home.focusPanel.prompt")}</p>
              <p className="mt-3 text-4xl font-semibold">你好</p>
              <p className="mt-2 text-sm text-slate-400">nǐ hǎo</p>
              <div className="mt-6 flex gap-3">
                <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">
                  {t("home.focusPanel.reveal")}
                </div>
                <div className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white">
                  {t("home.focusPanel.next")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {sampleLessons.map((lesson) => (
            <ContentCard
              key={lesson.id}
              title={lesson.title}
              description={lesson.description ?? ""}
              badge={`HSK ${lesson.hskLevel}`}
              meta={[
                lesson.topicName ?? t("common.general"),
                t("common.wordCount", { count: lesson.wordCount }),
                t("common.grammarCount", { count: lesson.grammarCount }),
                t("common.minutesShort", { count: lesson.estimatedMinutes }),
              ]}
              href={link(`/lessons/${lesson.slug}`)}
              ctaLabel={t("common.openLesson")}
            />
          ))}
      </section>
    </div>
  );
}
