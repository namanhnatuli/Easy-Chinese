"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Eraser, LogIn } from "lucide-react";
import { toast } from "sonner";

import { AiSentenceGeneratorCard } from "@/components/ai/ai-sentence-generator-card";
import { HanziWritingCanvas } from "@/components/practice/hanzi-writing-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { predictDueHintsForGrades } from "@/features/memory/spaced-repetition";
import type { WritingPracticeWordDetail } from "@/features/practice/types";
import { useI18n } from "@/i18n/client";
import type { SchedulerGrade } from "@/types/domain";

export function WritingPracticeSession({
  word,
  isAuthenticated,
  signInHref,
}: {
  word: WritingPracticeWordDetail;
  isAuthenticated: boolean;
  signInHref: string;
}) {
  const { t, link } = useI18n();
  const [index, setIndex] = useState(0);
  const [clearSignal, setClearSignal] = useState(0);
  const [showAnonymousNotice, setShowAnonymousNotice] = useState(false);
  const [againCount, setAgainCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);
  const [goodCount, setGoodCount] = useState(0);
  const [easyCount, setEasyCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showGuideOverlay, setShowGuideOverlay] = useState(true);

  const currentCharacter = word.characters[index] ?? null;
  const progressPercent = useMemo(() => {
    if (word.characters.length === 0) {
      return 0;
    }

    return Math.round((Math.min(index + 1, word.characters.length) / word.characters.length) * 100);
  }, [index, word.characters.length]);
  const dueHints = predictDueHintsForGrades(word.memory, new Date());

  useEffect(() => {
    setClearSignal((value) => value + 1);
  }, [index]);

  async function handlePersist(grade: SchedulerGrade) {
    if (!currentCharacter) {
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
      setIndex((value) => Math.min(value + 1, word.characters.length));
      setClearSignal((value) => value + 1);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/practice/writing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wordId: word.id,
          character: currentCharacter.character,
          grade,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        toast.error(body?.message ?? t("practice.writing.saveFailed"));
      }
    } finally {
      setIsSaving(false);
      setIndex((value) => Math.min(value + 1, word.characters.length));
      setClearSignal((value) => value + 1);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || !currentCharacter) {
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        void handlePersist("again");
      } else if (event.key === "2") {
        event.preventDefault();
        void handlePersist("hard");
      } else if (event.key === "3") {
        event.preventDefault();
        void handlePersist("good");
      } else if (event.key === "4") {
        event.preventDefault();
        void handlePersist("easy");
      } else if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        setClearSignal((value) => value + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((value) => Math.max(value - 1, 0));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((value) => Math.min(value + 1, word.characters.length - 1));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentCharacter, word.characters.length]);

  if (!currentCharacter) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-6 text-white shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          {t("practice.completeEyebrow")}
        </p>
        <h2 className="mt-2 text-3xl font-semibold">{word.hanzi}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{t("practice.writing.completeDescription")}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.5rem] bg-slate-400/10 p-4">
            <p className="text-sm text-slate-200">{t("practice.grades.again")}</p>
            <p className="mt-2 text-3xl font-semibold">{againCount}</p>
          </div>
          <div className="rounded-[1.5rem] bg-amber-400/10 p-4">
            <p className="text-sm text-amber-200">{t("practice.grades.hard")}</p>
            <p className="mt-2 text-3xl font-semibold">{hardCount}</p>
          </div>
          <div className="rounded-[1.5rem] bg-emerald-400/10 p-4">
            <p className="text-sm text-emerald-200">{t("practice.grades.good")}</p>
            <p className="mt-2 text-3xl font-semibold">{goodCount}</p>
          </div>
          <div className="rounded-[1.5rem] bg-sky-400/10 p-4">
            <p className="text-sm text-sky-200">{t("practice.grades.easy")}</p>
            <p className="mt-2 text-3xl font-semibold">{easyCount}</p>
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
              setClearSignal((value) => value + 1);
            }}
            className="bg-white text-slate-950 hover:bg-white/90"
          >
            {t("practice.restart")}
          </Button>
          <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <Link href={link("/practice/writing")}>{t("practice.writing.backToWords")}</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-panel sm:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {t("practice.writing.eyebrow")}
            </p>
            <h2 className="text-3xl font-semibold">{word.hanzi}</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">{t("practice.writing.description")}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{index + 1} / {word.characters.length}</Badge>
            <Badge variant="secondary">{progressPercent}%</Badge>
            <Badge variant="outline">{isSaving ? t("common.saving") : t("practice.writing.canvasBadge")}</Badge>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.max(progressPercent, 6)}%` }} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <aside className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {t("practice.writing.targetCharacter")}
              </p>
              <p className="mt-4 text-[5rem] font-semibold leading-none text-white sm:text-[6rem]">
                {currentCharacter.character}
              </p>
              <p className="mt-4 text-lg text-slate-300">{word.pinyin}</p>
              <p className="mt-2 text-base text-slate-300">{word.vietnameseMeaning}</p>
            </div>

            <div className="rounded-[1.25rem] bg-black/20 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">{t("practice.writing.characterStatus")}</p>
              <p className="mt-3">{t("practice.status", { value: currentCharacter.status })}</p>
              <p className="mt-1">{t("practice.writing.attempts", { count: currentCharacter.attemptCount })}</p>
            </div>

            <div className="rounded-[1.25rem] bg-black/20 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">{t("practice.writing.strokeGuideTitle")}</p>
              <p className="mt-3">{t("practice.writing.strokeGuideDescription")}</p>
              <p className="mt-2">{t("practice.writing.strokeGuideRule")}</p>
            </div>

            {(!isAuthenticated || showAnonymousNotice) ? (
              <div className="rounded-[1.25rem] border border-amber-300/20 bg-amber-400/10 p-4">
                <p className="text-sm font-semibold text-amber-100">{t("practice.signInNotice")}</p>
                <Button asChild className="mt-3 bg-white text-slate-950 hover:bg-white/90">
                  <Link href={signInHref}>
                    <LogIn className="size-4" />
                    {t("practice.signInToSave")}
                  </Link>
                </Button>
              </div>
            ) : null}
          </aside>

          <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <HanziWritingCanvas
              clearSignal={clearSignal}
              showGrid={showGrid}
              showGuideOverlay={showGuideOverlay}
              guideCharacter={currentCharacter.character}
            />

            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={() => setClearSignal((value) => value + 1)}>
                <Eraser className="size-4" />
                {t("practice.writing.clearCanvas")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowGrid((value) => !value)}>
                {showGrid ? t("practice.writing.hideGrid") : t("practice.writing.showGrid")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowGuideOverlay((value) => !value)}>
                {showGuideOverlay ? t("practice.writing.hideGuide") : t("practice.writing.showGuide")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIndex((value) => Math.max(value - 1, 0))} disabled={index === 0}>
                <ArrowLeft className="size-4" />
                {t("common.previous")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIndex((value) => Math.min(value + 1, word.characters.length - 1))} disabled={index >= word.characters.length - 1}>
                {t("common.next")}
                <ArrowRight className="size-4" />
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" size="lg" variant="outline" onClick={() => void handlePersist("again")}>
                <span className="flex flex-col items-center leading-tight">
                  <span>{t("practice.grades.again")}</span>
                  <span className="text-[0.68rem] opacity-80">{dueHints.again}</span>
                </span>
              </Button>
              <Button type="button" size="lg" variant="secondary" onClick={() => void handlePersist("hard")}>
                <span className="flex flex-col items-center leading-tight">
                  <span>{t("practice.grades.hard")}</span>
                  <span className="text-[0.68rem] opacity-80">{dueHints.hard}</span>
                </span>
              </Button>
              <Button type="button" size="lg" className="bg-emerald-500 text-white hover:bg-emerald-400" onClick={() => void handlePersist("good")}>
                <CheckCircle2 className="size-4" />
                <span className="flex flex-col items-start leading-tight">
                  <span>{t("practice.grades.good")}</span>
                  <span className="text-[0.68rem] opacity-80">{dueHints.good}</span>
                </span>
              </Button>
              <Button type="button" size="lg" className="bg-sky-500 text-white hover:bg-sky-400" onClick={() => void handlePersist("easy")}>
                <span className="flex flex-col items-center leading-tight">
                  <span>{t("practice.grades.easy")}</span>
                  <span className="text-[0.68rem] opacity-80">{dueHints.easy}</span>
                </span>
              </Button>
            </div>

            <AiSentenceGeneratorCard
              wordId={word.id}
              title={t("ai.sentences.title")}
              description={t("ai.sentences.description")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
