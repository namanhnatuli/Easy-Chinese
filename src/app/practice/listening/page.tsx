import { z } from "zod";

import { ListeningPracticeSession } from "@/components/practice/listening-practice-session";
import { PageHeader } from "@/components/shared/page-header";
import { getListeningSessionItems } from "@/features/listening/queries";
import { getServerI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

const listeningSearchSchema = z.object({
  difficulty: z.enum(["all", "easy", "medium", "hard"]).default("all"),
  sourceType: z.enum(["all", "word", "example", "article", "custom"]).default("all"),
});

export default async function PracticeListeningPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = (await searchParams) ?? {};
  const resolvedSearchParams = listeningSearchSchema.parse({
    difficulty: Array.isArray(rawSearchParams.difficulty)
      ? rawSearchParams.difficulty[0]
      : rawSearchParams.difficulty,
    sourceType: Array.isArray(rawSearchParams.sourceType)
      ? rawSearchParams.sourceType[0]
      : rawSearchParams.sourceType,
  });

  const [user, { t, link }] = await Promise.all([getCurrentUser(), getServerI18n()]);
  const items = await getListeningSessionItems({
    userId: user?.id,
    difficulty: resolvedSearchParams.difficulty,
    sourceType: resolvedSearchParams.sourceType,
    limit: 12,
  });
  const signInHref = `${link("/auth/sign-in")}?next=${encodeURIComponent(link("/practice/listening"))}`;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("practice.listening.eyebrow")}
        badge={t("practice.cards.listening.title")}
        title={t("practice.listening.title")}
        description={t("practice.listening.description")}
      />

      <ListeningPracticeSession
        items={items}
        title={t("practice.listening.title")}
        description={t("practice.listening.description")}
        isAuthenticated={Boolean(user)}
        signInHref={signInHref}
        activeDifficulty={resolvedSearchParams.difficulty}
        activeSourceType={resolvedSearchParams.sourceType}
      />
    </div>
  );
}
