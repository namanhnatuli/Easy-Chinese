import Link from "next/link";
import { BookOpen, Filter } from "lucide-react";

import { ContentCard } from "@/components/shared/content-card";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sampleLessons } from "@/types/domain";

export default function LessonsPage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Lessons"
        badge="Public browsing"
        title="Follow a structured lesson path"
        description="Lessons combine vocabulary, grammar, and practice context so learners can move through HSK content in a more coherent sequence."
        actions={
          <Button asChild>
            <Link href="/vocabulary">Browse vocabulary</Link>
          </Button>
        }
      />

      <FilterBar>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-muted">
            <Filter className="size-4" />
          </span>
          <div>
            <p className="font-medium text-foreground">Lesson filters</p>
            <p>Level, topic, and duration controls can live here once data fetching is wired.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">HSK 1</Badge>
          <Badge variant="secondary">Greetings</Badge>
          <Badge variant="secondary">Introductions</Badge>
        </div>
      </FilterBar>

      <section className="grid gap-4 lg:grid-cols-2">
        {sampleLessons.map((lesson) => (
          <div key={lesson.id} className="flex flex-col gap-4">
            <ContentCard
              title={lesson.title}
              description={lesson.description ?? ""}
              badge={lesson.topicName ?? "General"}
              meta={[`HSK ${lesson.hskLevel}`, `${lesson.wordCount} words`, `${lesson.grammarCount} grammar`, `${lesson.estimatedMinutes} min`]}
              href={`/lessons/${lesson.slug}`}
              ctaLabel="Lesson details"
            />
            <div className="flex items-center gap-2 px-2">
              <Button asChild variant="ghost" className="h-10 px-2">
                <Link href={`/learn/lesson/${lesson.id}`}>
                  <BookOpen className="size-4" />
                  Start learning
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
