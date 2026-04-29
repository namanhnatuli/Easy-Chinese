"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Languages, LogIn, SkipForward, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { AiSentenceGeneratorCard } from "@/components/ai/ai-sentence-generator-card";
import { PronunciationFeedback } from "@/components/practice/pronunciation-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { predictDueHintsForGrades } from "@/features/memory/spaced-repetition";
import type { LearningSchedulerSettings } from "@/features/memory/spaced-repetition";
import { useI18n } from "@/i18n/client";
import type { ReadingPracticeItem } from "@/features/practice/types";
import type { SchedulerGrade } from "@/types/domain";

function getReadingPayload(item: ReadingPracticeItem, grade: SchedulerGrade) {
  if (item.kind === "word") {
    return {
      practiceType: "word",
      wordId: item.id,
      grade,
    };
  }

  return {
    practiceType: "sentence",
    exampleId: item.id,
    grade,
  };
}

function getSpeechText(item: ReadingPracticeItem) {
  return item.kind === "word" ? item.hanzi : item.chineseText;
}

function getItemMemory(item: ReadingPracticeItem) {
  return item.memory;
}

export function ReadingPracticeSession({
  items,
  title,
  description,
  isAuthenticated,
  signInHref,
  schedulerSettings,
}: {
  items: ReadingPracticeItem[];
  title: string;
  description: string;
  isAuthenticated: boolean;
  signInHref: string;
  schedulerSettings?: Partial<LearningSchedulerSettings> | null;
}) {
  const { t, link } = useI18n();
  const [index, setIndex] = useState(0);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);
  const [showAnonymousNotice, setShowAnonymousNotice] = useState(false);
  const [againCount, setAgainCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);
  const [goodCount, setGoodCount] = useState(0);
  const [easyCount, setEasyCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const currentItem = items[index] ?? null;
  const isFinished = !currentItem;
  const progressPercent = useMemo(() => {
    if (items.length === 0) {
      return 0;
    }

    return Math.round((Math.min(index + 1, items.length) / items.length) * 100);
  }, [index, items.length]);
  const dueHints = currentItem
    ? predictDueHintsForGrades(getItemMemory(currentItem), new Date(), schedulerSettings)
    : null;

  function playAudio() {
    if (
      !currentItem ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof window.SpeechSynthesisUtterance === "undefined"
    ) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(getSpeechText(currentItem));
      utterance.lang = "zh-CN";
      utterance.rate = 0.82;
      window.speechSynthesis.speak(utterance);
    } catch {
      toast.error(t("practice.reading.audioUnavailable"));
    }
  }

  async function handleGrade(grade: SchedulerGrade) {
    if (!currentItem) {
      return;
    }

    if (grade === "again") {
      setAgainCount((value) => value + 1);
    } else if (grade === "hard") {
      setHardCount((value) => value + 1);
    } else if (grade === "good") {
      setGoodCount((value) => value + 1);
    } else {
      setEasyCount((value) => value + 1);
    }

    if (!isAuthenticated) {
      setShowAnonymousNotice(true);
      setIndex((value) => value + 1);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/practice/reading", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getReadingPayload(currentItem, grade)),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        toast.error(body?.message ?? t("practice.reading.saveFailed"));
      }
    } finally {
      setIsSaving(false);
      setIndex((value) => value + 1);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || !currentItem) {
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        void handleGrade("again");
      } else if (event.key === "2") {
        event.preventDefault();
        void handleGrade("hard");
      } else if (event.key === "3") {
        event.preventDefault();
        void handleGrade("good");
      } else if (event.key === "4") {
        event.preventDefault();
        void handleGrade("easy");
      } else if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        playAudio();
      } else if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        setShowPinyin((value) => !value);
      } else if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        setShowMeaning((value) => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentItem, t]);

  if (items.length === 0) {
    return (
      <section className="rounded-[2rem] border border-dashed border-border bg-card/90 p-8 text-center">
        <h2 className="text-2xl font-semibold">{t("practice.emptyTitle")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("practice.reading.emptyDescription")}</p>
      </section>
    );
  }

  if (isFinished) {
    return (
      <section className="surface-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t("practice.completeEyebrow")}
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-foreground">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("practice.grades.good")}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{goodCount}</p>
          </div>
          <div className="rounded-[1.5rem] bg-amber-500/10 p-4">
            <p className="text-sm text-amber-600 dark:text-amber-400">{t("practice.grades.hard")}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{hardCount}</p>
          </div>
          <div className="grid gap-4 sm:col-span-1">
            <div className="rounded-[1.5rem] bg-slate-500/10 p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t("practice.grades.again")}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{againCount}</p>
            </div>
            <div className="rounded-[1.5rem] bg-sky-500/10 p-4">
              <p className="text-sm text-sky-600 dark:text-sky-400">{t("practice.grades.easy")}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{easyCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              setIndex(0);
              setAgainCount(0);
              setHardCount(0);
              setGoodCount(0);
              setEasyCount(0);
            }}
          >
            {t("practice.restart")}
          </Button>
          <Button asChild variant="outline">
            <Link href={link("/practice")}>{t("practice.backToPractice")}</Link>
          </Button>
        </div>
      </section>
    );
  }

  const chineseText = currentItem.kind === "word" ? currentItem.hanzi : currentItem.chineseText;
  const pinyin = currentItem.kind === "word" ? currentItem.pinyin : currentItem.pinyin;
  const meaning = currentItem.kind === "word" ? currentItem.vietnameseMeaning : currentItem.vietnameseMeaning;

  return (
    <section className="surface-panel p-5 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t("practice.reading.eyebrow")}
            </p>
            <h2 className="text-3xl font-semibold text-foreground">{title}</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{index + 1} / {items.length}</Badge>
            <Badge variant="secondary">{progressPercent}%</Badge>
            <Badge variant="outline">{isSaving ? t("common.saving") : t("practice.reading.ttsBadge")}</Badge>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(progressPercent, 6)}%` }} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
          <div className="rounded-[1.75rem] border bg-muted/30 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" onClick={playAudio}>
                <Volume2 className="size-4" />
                {t("practice.reading.playAudio")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowPinyin((value) => !value)}>
                {showPinyin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {showPinyin ? t("practice.reading.hidePinyin") : t("practice.reading.showPinyin")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowMeaning((value) => !value)}>
                <Languages className="size-4" />
                {showMeaning ? t("practice.reading.hideMeaning") : t("practice.reading.showMeaning")}
              </Button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-[3rem] font-semibold leading-tight tracking-[0.04em] text-foreground sm:text-[4.5rem]">
                {chineseText}
              </p>
              {showPinyin && pinyin ? (
                <p className="mt-4 text-lg text-muted-foreground sm:text-xl">{pinyin}</p>
              ) : null}
              {showMeaning ? (
                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {meaning}
                </p>
              ) : null}
            </div>

            {currentItem.kind === "sentence" && currentItem.linkedWord ? (
              <div className="mt-8 rounded-[1.5rem] border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {t("practice.reading.linkedWord")}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="text-2xl font-semibold text-foreground">{currentItem.linkedWord.hanzi}</p>
                  <p className="text-sm text-muted-foreground">{currentItem.linkedWord.pinyin}</p>
                  <Button asChild variant="outline">
                    <Link href={link(`/vocabulary/${currentItem.linkedWord.slug}`)}>{t("practice.reading.openWord")}</Link>
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button type="button" size="lg" variant="outline" onClick={() => void handleGrade("again")}>
                <span className="flex flex-col items-center leading-tight">
                  <span>{t("practice.grades.again")}</span>
                  <span className="text-[0.68rem] opacity-80">{dueHints?.again ?? "now"}</span>
                </span>
              </Button>
              <Button type="button" size="lg" variant="secondary" onClick={() => void handleGrade("hard")}>
                <span className="flex flex-col items-center leading-tight">
                  <span>{t("practice.grades.hard")}</span>
                  <span className="text-[0.68rem] opacity-80">{dueHints?.hard ?? "now"}</span>
                </span>
              </Button>
              <Button type="button" size="lg" className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={() => void handleGrade("good")}>
                <CheckCircle2 className="size-4" />
                <span className="flex flex-col items-start leading-tight">
                  <span>{t("practice.grades.good")}</span>
                  <span className="text-[0.68rem] opacity-80">{dueHints?.good ?? "now"}</span>
                </span>
              </Button>
              <Button type="button" size="lg" className="bg-sky-600 text-white hover:bg-sky-500" onClick={() => void handleGrade("easy")}>
                <SkipForward className="size-4" />
                <span className="flex flex-col items-start leading-tight">
                  <span>{t("practice.grades.easy")}</span>
                  <span className="text-[0.68rem] opacity-80">{dueHints?.easy ?? "now"}</span>
                </span>
              </Button>
            </div>

            {currentItem.kind === "word" ? (
              <div className="mt-6">
                <AiSentenceGeneratorCard
                  wordId={currentItem.id}
                  title={t("ai.sentences.practiceTitle")}
                  description={t("ai.sentences.practiceDescription")}
                />
              </div>
            ) : null}
          </div>

          <aside className="space-y-4 rounded-[1.75rem] border bg-muted/10 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {t("practice.reading.currentStatus")}
              </p>
              <p className="mt-3 text-sm text-foreground">
                {t("practice.status", { value: currentItem.progress?.status ?? "new" })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("practice.reading.attempts", { count: currentItem.progress?.attemptCount ?? 0 })}
              </p>
            </div>

            <div className="rounded-[1.25rem] bg-secondary/50 p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{t("practice.reading.shortcutsTitle")}</p>
              <p className="mt-3">{t("practice.reading.shortcutAgain")}</p>
              <p className="mt-1">{t("practice.reading.shortcutHard")}</p>
              <p className="mt-1">{t("practice.reading.shortcutGood")}</p>
              <p className="mt-1">{t("practice.reading.shortcutEasy")}</p>
              <p className="mt-1">{t("practice.reading.shortcutPinyin")}</p>
              <p className="mt-1">{t("practice.reading.shortcutMeaning")}</p>
              <p className="mt-1">{t("practice.reading.shortcutAudio")}</p>
            </div>

            {(!isAuthenticated || showAnonymousNotice) ? (
              <div className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{t("practice.signInNotice")}</p>
                <Button asChild variant="outline" className="mt-3">
                  <Link href={signInHref}>
                    <LogIn className="size-4" />
                    {t("practice.signInToSave")}
                  </Link>
                </Button>
              </div>
            ) : null}

            <PronunciationFeedback expectedText={chineseText} />
          </aside>
        </div>
      </div>
    </section>
  );
}
