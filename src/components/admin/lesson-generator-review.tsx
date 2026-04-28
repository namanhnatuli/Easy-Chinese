"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, RotateCcw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GeneratedLessonCandidate, LessonGeneratorPreviewData } from "@/features/admin/lesson-generator";
import { useI18n } from "@/i18n/client";

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

export function LessonGeneratorReview({
  preview,
  saveAction,
}: {
  preview: LessonGeneratorPreviewData;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const { t, link } = useI18n();
  const [title, setTitle] = useState(preview.title);
  const [slug, setSlug] = useState(preview.slug);
  const [summary, setSummary] = useState(preview.summary);
  const [selectedWords, setSelectedWords] = useState(preview.selectedWords);
  const [replacementWords, setReplacementWords] = useState(preview.replacementWords);

  const averageDifficulty = useMemo(() => {
    if (selectedWords.length === 0) {
      return 0;
    }

    return (
      Math.round(
        (selectedWords.reduce((total, word) => total + word.difficultyScore, 0) / selectedWords.length) * 100,
      ) / 100
    );
  }, [selectedWords]);

  const removeWord = (wordId: string) => {
    const currentWord = selectedWords.find((word) => word.wordId === wordId);
    if (!currentWord) {
      return;
    }

    setSelectedWords((current) => current.filter((word) => word.wordId !== wordId));
    setReplacementWords((current) =>
      [...current, currentWord].sort((left, right) => left.slug.localeCompare(right.slug)),
    );
  };

  const restoreWord = (candidate: GeneratedLessonCandidate) => {
    setSelectedWords((current) => [...current, candidate]);
    setReplacementWords((current) => current.filter((word) => word.wordId !== candidate.wordId));
  };

  const replaceWord = (currentWordId: string, replacementWordId: string) => {
    if (!replacementWordId) {
      return;
    }

    const replacement = replacementWords.find((word) => word.wordId === replacementWordId);
    const currentWord = selectedWords.find((word) => word.wordId === currentWordId);
    if (!replacement || !currentWord) {
      return;
    }

    setSelectedWords((current) =>
      current.map((word) => (word.wordId === currentWordId ? replacement : word)),
    );
    setReplacementWords((current) =>
      [...current.filter((word) => word.wordId !== replacementWordId), currentWord].sort((left, right) =>
        left.slug.localeCompare(right.slug),
      ),
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-card/95">
        <CardHeader>
          <CardTitle>{t("admin.lessonGenerator.review.title")}</CardTitle>
          <CardDescription>{t("admin.lessonGenerator.review.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("admin.lessonGenerator.review.selectedWords")}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{selectedWords.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("admin.lessonGenerator.review.averageDifficulty")}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{averageDifficulty}</p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{t("admin.lessonGenerator.review.replacements")}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{replacementWords.length}</p>
          </div>
        </CardContent>
      </Card>

      <form action={saveAction} className="space-y-6">
        <input type="hidden" name="hsk_level" value={String(preview.input.hskLevel)} />
        <input type="hidden" name="topic_tag_slugs" value={preview.input.topicTagSlugs.join(" | ")} />
        <input type="hidden" name="target_word_count" value={String(preview.input.targetWordCount)} />
        <input
          type="hidden"
          name="exclude_published_lesson_words"
          value={String(preview.input.excludePublishedLessonWords)}
        />
        <input type="hidden" name="include_unapproved_words" value={String(preview.input.includeUnapprovedWords)} />
        <input type="hidden" name="allow_reused_words" value={String(preview.input.allowReusedWords)} />
        <input
          type="hidden"
          name="selected_words_json"
          value={JSON.stringify(
            selectedWords.map((word) => ({
              ...word,
            })),
          )}
        />

        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("admin.lessonGenerator.review.lessonDraft")}</CardTitle>
            <CardDescription>{t("admin.lessonGenerator.review.lessonDraftDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="generated-title">{t("admin.lessonGenerator.review.lessonTitle")}</Label>
              <Input id="generated-title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="generated-slug">{t("admin.lessonGenerator.review.lessonSlug")}</Label>
              <Input id="generated-slug" name="slug" value={slug} onChange={(event) => setSlug(event.target.value)} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="generated-summary">{t("admin.lessonGenerator.review.lessonSummary")}</Label>
              <textarea
                id="generated-summary"
                name="summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="min-h-24 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("admin.lessonGenerator.review.previewTableTitle")}</CardTitle>
            <CardDescription>{t("admin.lessonGenerator.review.previewTableDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedWords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                {t("admin.lessonGenerator.review.emptySelection")}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t("admin.lessonGenerator.review.word")}</TableHead>
                      <TableHead>{t("admin.lessonGenerator.review.difficulty")}</TableHead>
                      <TableHead>{t("admin.lessonGenerator.review.relevance")}</TableHead>
                      <TableHead>{t("admin.lessonGenerator.review.reason")}</TableHead>
                      <TableHead>{t("admin.lessonGenerator.review.lessons")}</TableHead>
                      <TableHead>{t("admin.lessonGenerator.review.replace")}</TableHead>
                      <TableHead className="text-right">{t("admin.lessonGenerator.review.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedWords.map((word, index) => (
                      <TableRow key={word.wordId}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <div className="font-chinese text-lg font-semibold text-foreground">{word.hanzi}</div>
                          <div className="text-xs text-muted-foreground">
                            {word.pinyin} · {word.vietnameseMeaning}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {word.isNewWord ? (
                              <Badge variant="success">{t("admin.lessonGenerator.review.newWord")}</Badge>
                            ) : (
                              <Badge variant="secondary">{t("admin.lessonGenerator.review.reusedWord")}</Badge>
                            )}
                            {word.tagSlugs.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{word.difficultyScore}</TableCell>
                        <TableCell>{word.relevanceScore}</TableCell>
                        <TableCell className="max-w-sm text-sm text-muted-foreground">{word.selectionReason}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            {word.lessonMemberships.length === 0 ? (
                              <span className="text-sm text-muted-foreground">
                                {t("admin.lessonGenerator.review.noLessonUsage")}
                              </span>
                            ) : (
                              word.lessonMemberships.map((lesson) => (
                                <Link
                                  key={`${word.wordId}-${lesson.lessonId}`}
                                  href={link(`/admin/lessons/${lesson.lessonId}/edit`)}
                                  className="text-sm text-primary underline-offset-4 hover:underline"
                                >
                                  {lesson.lessonTitle}
                                  {lesson.isPublished ? ` (${t("admin.status.published")})` : ` (${t("admin.status.draft")})`}
                                </Link>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <select
                            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                            defaultValue=""
                            onChange={(event) => {
                              replaceWord(word.wordId, event.target.value);
                              event.currentTarget.value = "";
                            }}
                          >
                            <option value="">{t("admin.lessonGenerator.review.chooseReplacement")}</option>
                            {replacementWords.map((replacement) => (
                              <option key={replacement.wordId} value={replacement.wordId}>
                                {replacement.hanzi} · {replacement.pinyin}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={index === 0}
                              onClick={() => setSelectedWords((current) => moveItem(current, index, index - 1))}
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={index === selectedWords.length - 1}
                              onClick={() => setSelectedWords((current) => moveItem(current, index, index + 1))}
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeWord(word.wordId)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {replacementWords.length > 0 ? (
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <RotateCcw className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{t("admin.lessonGenerator.review.replacementPool")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {replacementWords.slice(0, 12).map((word) => (
                    <Button key={word.wordId} type="button" variant="outline" size="sm" onClick={() => restoreWord(word)}>
                      {word.hanzi} · {word.pinyin}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={selectedWords.length === 0}>
                {t("admin.lessonGenerator.review.saveDraft")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
