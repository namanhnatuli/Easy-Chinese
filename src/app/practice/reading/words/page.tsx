import { z } from "zod";

import { ReadingPracticeSession } from "@/components/practice/reading-practice-session";
import { PageHeader } from "@/components/shared/page-header";
import { listReadingWordPracticeItems } from "@/features/practice/queries";
import { getServerI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

const readingWordSearchSchema = z.object({
  word: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
});

export default async function PracticeReadingWordsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = (await searchParams) ?? {};
  const resolvedSearchParams = readingWordSearchSchema.parse({
    word: Array.isArray(rawSearchParams.word) ? rawSearchParams.word[0] : rawSearchParams.word,
    lessonId: Array.isArray(rawSearchParams.lessonId) ? rawSearchParams.lessonId[0] : rawSearchParams.lessonId,
  });
  const [user, { t, link }] = await Promise.all([getCurrentUser(), getServerI18n()]);
  const items = await listReadingWordPracticeItems({
    userId: user?.id,
    wordId: resolvedSearchParams.word,
    lessonId: resolvedSearchParams.lessonId,
  });

  const signInHref = `${link("/auth/sign-in")}?next=${encodeURIComponent(link("/practice/reading/words"))}`;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("practice.reading.eyebrow")}
        badge={t("practice.cards.readingWords.title")}
        title={t("practice.cards.readingWords.title")}
        description={t("practice.cards.readingWords.description")}
      />

      <ReadingPracticeSession
        items={items}
        title={t("practice.cards.readingWords.title")}
        description={t("practice.reading.wordsSessionDescription")}
        isAuthenticated={Boolean(user)}
        signInHref={signInHref}
      />
    </div>
  );
}
