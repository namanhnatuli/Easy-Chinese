import { notFound } from "next/navigation";

import { WritingPracticeSession } from "@/components/practice/writing-practice-session";
import { PageHeader } from "@/components/shared/page-header";
import { getUserLearningSchedulerSettings } from "@/features/memory/queries";
import { getWritingPracticeWordDetail } from "@/features/practice/queries";
import { getServerI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

export default async function PracticeWritingWordPage({
  params,
}: {
  params: Promise<{ wordId: string }>;
}) {
  const { wordId } = await params;
  const [user, { t, link }] = await Promise.all([getCurrentUser(), getServerI18n()]);
  const word = await getWritingPracticeWordDetail({
    wordId,
    userId: user?.id,
  });
  const schedulerSettings = user ? await getUserLearningSchedulerSettings(user.id) : null;

  if (!word) {
    notFound();
  }

  const signInHref = `${link("/auth/sign-in")}?next=${encodeURIComponent(link(`/practice/writing/${word.id}`))}`;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("practice.writing.eyebrow")}
        badge={`HSK ${word.hskLevel}`}
        title={word.hanzi}
        description={word.vietnameseMeaning}
      />

      <WritingPracticeSession
        word={word}
        isAuthenticated={Boolean(user)}
        signInHref={signInHref}
        schedulerSettings={schedulerSettings}
      />
    </div>
  );
}
