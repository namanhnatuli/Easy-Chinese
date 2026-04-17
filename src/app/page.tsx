import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Sparkles } from "lucide-react";

import { ContentCard } from "@/components/shared/content-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sampleLessons } from "@/types/domain";

export default function HomePage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Structured Chinese study"
        badge="Vietnamese-first learning"
        title="A calmer way to build Chinese vocabulary, grammar, and daily consistency"
        description="Browse public lessons, start practicing immediately, and unlock saved progress when you are ready. The experience stays focused, readable, and structured around one clear next step."
        actions={
          <>
            <Button asChild size="lg">
              <Link href="/lessons">
                Explore lessons
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/sign-in">Sign in for saved progress</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Learning modes"
          value="3"
          description="Flashcard, multiple choice, and typing practice in one platform."
          icon={<Sparkles className="size-5 text-primary" />}
        />
        <StatCard
          label="Lesson structure"
          value="Words + Grammar"
          description="Each lesson blends vocabulary and pattern recognition instead of isolating them."
          icon={<BookOpen className="size-5 text-primary" />}
          accent="success"
        />
        <StatCard
          label="Study tone"
          value="Focused"
          description="Quiet surfaces, sharp hierarchy, and a dark study panel for practice sessions."
          icon={<GraduationCap className="size-5 text-white" />}
          accent="dark"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden border-border/80">
          <CardContent className="grid gap-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Study path</Badge>
              <Badge variant="warning">Anonymous-friendly</Badge>
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Move from browsing to deliberate practice without friction</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Public pages help learners explore lessons, vocabulary, and grammar before signing in. Protected pages add saved progress, settings, and admin content management without changing the mental model of the app.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Browse", "Open lessons, words, and grammar by level or topic."],
                ["Practice", "Switch modes without losing the context of the lesson."],
                ["Review", "Save progress later when you are ready to track it."],
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
              Focused study panel
            </p>
            <h2 className="mt-4 text-2xl font-semibold">Designed for concentration, not clutter</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Practice surfaces keep the prompt central, controls large, and supporting information secondary so the learner can stay inside the exercise.
            </p>
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Prompt</p>
              <p className="mt-3 text-4xl font-semibold">你好</p>
              <p className="mt-2 text-sm text-slate-400">nǐ hǎo</p>
              <div className="mt-6 flex gap-3">
                <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">
                  Reveal
                </div>
                <div className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white">
                  Next
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
            meta={[lesson.topicName ?? "General", `${lesson.wordCount} words`, `${lesson.grammarCount} grammar`, `${lesson.estimatedMinutes} min`]}
            href={`/lessons/${lesson.slug}`}
            ctaLabel="Open lesson"
          />
        ))}
      </section>
    </div>
  );
}
