"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Headphones, Lightbulb, Loader2, LogIn, RotateCcw, SkipForward } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { evaluateListeningDictationAnswer } from "@/features/listening/evaluation";
import type {
  ListeningHintState,
  ListeningPersistedOutcome,
  ListeningPracticeItem,
  ListeningSessionSummary,
} from "@/features/listening/types";
import { useI18n } from "@/i18n/client";

function getDefaultHintState(): ListeningHintState {
  return {
    firstCharacterRevealed: false,
    pinyinRevealed: false,
  };
}

function buildResultTone(result: "correct" | "almost" | "incorrect" | "skipped") {
  if (result === "correct") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (result === "almost") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300";
}

export function ListeningPracticeSession({
  items,
  title,
  description,
  isAuthenticated,
  signInHref,
  activeDifficulty,
  activeSourceType,
}: {
  items: ListeningPracticeItem[];
  title: string;
  description: string;
  isAuthenticated: boolean;
  signInHref: string;
  activeDifficulty: "all" | "easy" | "medium" | "hard";
  activeSourceType: "all" | "word" | "example" | "article" | "custom";
}) {
  const { t, link } = useI18n();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [hintState, setHintState] = useState<ListeningHintState>(getDefaultHintState);
  const [summary, setSummary] = useState<ListeningSessionSummary>({
    correct: 0,
    almost: 0,
    incorrect: 0,
    skipped: 0,
  });
  const [outcome, setOutcome] = useState<ListeningPersistedOutcome | null>(null);
  const [showAnonymousNotice, setShowAnonymousNotice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentItem = items[index] ?? null;
  const isFinished = !currentItem;
  const progressPercent = useMemo(() => {
    if (items.length === 0) {
      return 0;
    }

    return Math.round((Math.min(index + 1, items.length) / items.length) * 100);
  }, [index, items.length]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  async function playAudio() {
    if (!currentItem) {
      return;
    }

    setAudioError(null);
    setIsAudioLoading(true);

    try {
      let audio = audioRef.current;

      if (!audio || audio.src !== currentItem.audioUrl) {
        audio?.pause();
        audio = new Audio(currentItem.audioUrl);
        audioRef.current = audio;
      } else {
        audio.currentTime = 0;
      }

      await audio.play();
    } catch {
      setAudioError(t("practice.listening.audioUnavailable"));
    } finally {
      setIsAudioLoading(false);
    }
  }

  function resetCurrentStep() {
    setAnswer("");
    setSubmitted(false);
    setOutcome(null);
    setHintState(getDefaultHintState());
    setAudioError(null);
  }

  function moveToNextItem() {
    setIndex((value) => value + 1);
    resetCurrentStep();
  }

  function updateSummary(result: "correct" | "almost" | "incorrect" | "skipped") {
    setSummary((previous) => ({
      ...previous,
      [result]: previous[result] + 1,
    }));
  }

  async function handleSubmit() {
    if (!currentItem || submitted || answer.trim().length === 0) {
      return;
    }

    const localOutcome = evaluateListeningDictationAnswer({
      expected: currentItem.chineseText,
      answer,
      hintUsed: hintState.firstCharacterRevealed || hintState.pinyinRevealed,
    });

    setSubmitted(true);
    setOutcome({
      result: localOutcome.result,
      score: localOutcome.score,
      expectedText: currentItem.chineseText,
      normalizedExpected: localOutcome.normalizedExpected,
      normalizedAnswer: localOutcome.normalizedAnswer,
    });

    if (!isAuthenticated) {
      updateSummary(localOutcome.result);
      setShowAnonymousNotice(true);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/practice/listening", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ttsAudioCacheId: currentItem.id,
          answer,
          hintUsed: hintState.firstCharacterRevealed || hintState.pinyinRevealed,
          skipped: false,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { outcome?: ListeningPersistedOutcome; message?: string }
        | null;

      if (!response.ok || !body?.outcome) {
        throw new Error(body?.message ?? t("practice.listening.saveFailed"));
      }

      setOutcome(body.outcome);
      updateSummary(body.outcome.result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("practice.listening.saveFailed"));
      updateSummary(localOutcome.result);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSkip() {
    if (!currentItem || submitted) {
      return;
    }

    setSubmitted(true);
    const skippedOutcome: ListeningPersistedOutcome = {
      result: "skipped",
      score: 0,
      expectedText: currentItem.chineseText,
      normalizedExpected: "",
      normalizedAnswer: "",
    };
    setOutcome(skippedOutcome);

    if (!isAuthenticated) {
      updateSummary("skipped");
      setShowAnonymousNotice(true);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/practice/listening", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ttsAudioCacheId: currentItem.id,
          answer,
          hintUsed: hintState.firstCharacterRevealed || hintState.pinyinRevealed,
          skipped: true,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { outcome?: ListeningPersistedOutcome; message?: string }
        | null;

      if (!response.ok || !body?.outcome) {
        throw new Error(body?.message ?? t("practice.listening.saveFailed"));
      }

      setOutcome(body.outcome);
      updateSummary("skipped");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("practice.listening.saveFailed"));
      updateSummary("skipped");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (!currentItem) {
      return;
    }

    void playAudio();
  }, [currentItem?.id]);

  if (items.length === 0) {
    return (
      <section className="rounded-[2rem] border border-dashed border-border bg-card/90 p-8 text-center">
        <h2 className="text-2xl font-semibold">{t("practice.emptyTitle")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("practice.listening.emptyDescription")}</p>
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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("practice.listening.correct")}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{summary.correct}</p>
          </div>
          <div className="rounded-[1.5rem] bg-amber-500/10 p-4">
            <p className="text-sm text-amber-600 dark:text-amber-400">{t("practice.listening.almostCorrect")}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{summary.almost}</p>
          </div>
          <div className="rounded-[1.5rem] bg-slate-500/10 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t("practice.listening.incorrect")}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{summary.incorrect}</p>
          </div>
          <div className="rounded-[1.5rem] bg-secondary/70 p-4">
            <p className="text-sm text-muted-foreground">{t("practice.listening.skip")}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{summary.skipped}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              setIndex(0);
              setSummary({ correct: 0, almost: 0, incorrect: 0, skipped: 0 });
              resetCurrentStep();
            }}
          >
            <RotateCcw className="size-4" />
            {t("practice.restart")}
          </Button>
          <Button asChild variant="outline">
            <Link href={link("/practice")}>{t("practice.backToPractice")}</Link>
          </Button>
        </div>
      </section>
    );
  }

  const hintUsed = hintState.firstCharacterRevealed || hintState.pinyinRevealed;

  return (
    <section className="surface-panel p-5 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t("practice.listening.eyebrow")}
            </p>
            <h2 className="text-3xl font-semibold text-foreground">{title}</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <form action={link("/practice/listening")} className="flex flex-wrap gap-3">
              <label className="flex min-w-[9rem] flex-col gap-1 text-xs font-medium text-muted-foreground">
                <span>{t("practice.listening.filters.difficulty")}</span>
                <select
                  name="difficulty"
                  defaultValue={activeDifficulty}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="all">{t("practice.listening.filters.allDifficulties")}</option>
                  <option value="easy">{t("practice.listening.filters.easy")}</option>
                  <option value="medium">{t("practice.listening.filters.medium")}</option>
                  <option value="hard">{t("practice.listening.filters.hard")}</option>
                </select>
              </label>
              <label className="flex min-w-[9rem] flex-col gap-1 text-xs font-medium text-muted-foreground">
                <span>{t("practice.listening.filters.sourceType")}</span>
                <select
                  name="sourceType"
                  defaultValue={activeSourceType}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="all">{t("practice.listening.filters.allSources")}</option>
                  <option value="word">{t("practice.listening.sourceType.word")}</option>
                  <option value="example">{t("practice.listening.sourceType.example")}</option>
                  <option value="article">{t("practice.listening.sourceType.article")}</option>
                  <option value="custom">{t("practice.listening.sourceType.custom")}</option>
                </select>
              </label>
              <Button type="submit" variant="outline" className="self-end">
                {t("practice.listening.filters.apply")}
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{index + 1} / {items.length}</Badge>
              <Badge variant="secondary">{progressPercent}%</Badge>
              <Badge variant="outline">{currentItem.difficulty}</Badge>
              <Badge variant="outline">{t(`practice.listening.sourceType.${currentItem.sourceType}` as "practice.listening.sourceType.word")}</Badge>
              <Badge variant="outline">{isSaving ? t("common.saving") : t("practice.listening.cachedAudioBadge")}</Badge>
            </div>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(progressPercent, 6)}%` }} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <aside className="space-y-4 rounded-[1.75rem] border bg-muted/10 p-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {t("practice.listening.promptTitle")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={() => void playAudio()} disabled={isAudioLoading}>
                  {isAudioLoading ? <Loader2 className="size-4 animate-spin" /> : <Headphones className="size-4" />}
                  {submitted ? t("practice.listening.replay") : t("practice.listening.playAudio")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setHintState((previous) => ({
                      ...previous,
                      firstCharacterRevealed: !previous.firstCharacterRevealed,
                    }))
                  }
                >
                  <Lightbulb className="size-4" />
                  {t("practice.listening.showFirstCharacter")}
                </Button>
                {currentItem.pinyin ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setHintState((previous) => ({
                        ...previous,
                        pinyinRevealed: !previous.pinyinRevealed,
                      }))
                    }
                  >
                    <Lightbulb className="size-4" />
                    {t("practice.listening.showPinyinHint")}
                  </Button>
                ) : null}
              </div>
              {audioError ? <p className="text-sm text-destructive">{audioError}</p> : null}
            </div>

            <div className="rounded-[1.25rem] bg-secondary/50 p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{t("practice.listening.hintsTitle")}</p>
              <p className="mt-3">{t("practice.listening.characterCount", { count: currentItem.characterCount })}</p>
              <p className="mt-2">
                {t("practice.listening.sourceTypeLabel")}:{" "}
                <span className="font-semibold text-foreground">
                  {t(`practice.listening.sourceType.${currentItem.sourceType}` as "practice.listening.sourceType.word")}
                </span>
              </p>
              {hintState.firstCharacterRevealed ? (
                <p className="mt-2">
                  {t("practice.listening.firstCharacter")}:{" "}
                  <span className="font-semibold text-foreground">{Array.from(currentItem.chineseText)[0] ?? "—"}</span>
                </p>
              ) : null}
              {hintState.pinyinRevealed && currentItem.pinyin ? (
                <p className="mt-2 text-pinyin">{currentItem.pinyin}</p>
              ) : null}
              {hintUsed ? <p className="mt-3 text-xs">{t("practice.listening.hintAffectsScore")}</p> : null}
            </div>

            {currentItem.linkedWord ? (
              <div className="rounded-[1.25rem] bg-secondary/50 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">{t("practice.reading.linkedWord")}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="text-lg font-semibold text-foreground">{currentItem.linkedWord.hanzi}</p>
                  <p>{currentItem.linkedWord.pinyin}</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={link(`/vocabulary/${currentItem.linkedWord.slug}`)}>{t("practice.reading.openWord")}</Link>
                  </Button>
                </div>
              </div>
            ) : null}

            {!isAuthenticated || showAnonymousNotice ? (
              <div className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {t("practice.signInNotice")}
                </p>
                <Button asChild variant="outline" className="mt-3">
                  <Link href={signInHref}>
                    <LogIn className="size-4" />
                    {t("practice.signInToSave")}
                  </Link>
                </Button>
              </div>
            ) : null}
          </aside>

          <div className="rounded-[1.75rem] border bg-muted/30 p-6 sm:p-8">
            <label className="text-sm font-semibold text-foreground" htmlFor="listening-answer">
              {t("practice.listening.typeWhatYouHear")}
            </label>
            <Textarea
              id="listening-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder={t("practice.listening.answerPlaceholder")}
              className="mt-3 min-h-32 resize-y rounded-[1.25rem] bg-background"
              disabled={submitted}
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" onClick={() => void handleSubmit()} disabled={submitted || answer.trim().length === 0 || isSaving}>
                <CheckCircle2 className="size-4" />
                {t("practice.listening.checkAnswer")}
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleSkip()} disabled={submitted || isSaving}>
                <SkipForward className="size-4" />
                {t("practice.listening.skip")}
              </Button>
              {submitted ? (
                <Button type="button" variant="secondary" onClick={moveToNextItem} disabled={isSaving}>
                  {t("practice.listening.nextItem")}
                </Button>
              ) : null}
            </div>

            {submitted && outcome ? (
              <div className={`mt-6 rounded-[1.25rem] border p-4 ${buildResultTone(outcome.result)}`}>
                <p className="text-sm font-semibold">
                  {outcome.result === "correct"
                    ? t("practice.listening.correct")
                    : outcome.result === "almost"
                      ? t("practice.listening.almostCorrect")
                      : outcome.result === "incorrect"
                        ? t("practice.listening.incorrect")
                        : t("practice.listening.skipped")}
                </p>
                <p className="mt-2 text-sm">
                  {t("practice.listening.score", { value: Math.round(outcome.score * 100) })}
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {t("practice.listening.correctAnswer")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{outcome.expectedText}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {t(`practice.listening.sourceType.${currentItem.sourceType}` as "practice.listening.sourceType.word")}
                  </Badge>
                  {currentItem.linkedWord ? <Badge variant="outline">{t("practice.reading.linkedWord")}</Badge> : null}
                  {currentItem.linkedArticle ? <Badge variant="outline">{t("practice.listening.linkedArticle")}</Badge> : null}
                </div>
                {currentItem.pinyin ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {t("practice.listening.pinyinLabel")}
                    </p>
                    <p className="mt-2 text-pinyin">{currentItem.pinyin}</p>
                  </div>
                ) : null}
                {currentItem.vietnameseMeaning ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {t("practice.listening.meaningLabel")}
                    </p>
                    <p className="mt-2 text-sm text-foreground">{currentItem.vietnameseMeaning}</p>
                  </div>
                ) : null}
                {currentItem.linkedArticle ? (
                  <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link href={link(`/articles/${currentItem.linkedArticle.slug}`)}>
                      {t("practice.listening.openSource")}
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
