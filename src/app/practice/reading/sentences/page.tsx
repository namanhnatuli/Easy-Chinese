import { z } from "zod";

import { ReadingPracticeSession } from "@/components/practice/reading-practice-session";
import { PageHeader } from "@/components/shared/page-header";
import { getUserLearningSchedulerSettings } from "@/features/memory/queries";
import { listReadingSentencePracticeItems } from "@/features/practice/queries";
import { getServerI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

const readingSentenceSearchSchema = z.object({
  word: z.string().uuid().optional(),
});

export default async function PracticeReadingSentencesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = (await searchParams) ?? {};
  const resolvedSearchParams = readingSentenceSearchSchema.parse({
    word: Array.isArray(rawSearchParams.word) ? rawSearchParams.word[0] : rawSearchParams.word,
  });
  const [user, { t, link }] = await Promise.all([getCurrentUser(), getServerI18n()]);
  const items = await listReadingSentencePracticeItems({
    userId: user?.id,
    wordId: resolvedSearchParams.word,
  });
  const schedulerSettings = user ? await getUserLearningSchedulerSettings(user.id) : null;

  const signInHref = `${link("/auth/sign-in")}?next=${encodeURIComponent(link("/practice/reading/sentences"))}`;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("practice.reading.eyebrow")}
        badge={t("practice.cards.readingSentences.title")}
        title={t("practice.cards.readingSentences.title")}
        description={t("practice.cards.readingSentences.description")}
      />

      <ReadingPracticeSession
        items={items}
        title={t("practice.cards.readingSentences.title")}
        description={t("practice.reading.sentencesSessionDescription")}
        isAuthenticated={Boolean(user)}
        signInHref={signInHref}
        schedulerSettings={schedulerSettings}
      />
    </div>
  );
}
