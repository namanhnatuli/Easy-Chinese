import Link from "next/link";
import { Database, HardDrive, Volume2, Zap } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTtsCacheAdminOverview, preGenerateTtsCacheAction } from "@/features/admin/tts-cache";
import { requireAdminUser } from "@/lib/auth";
import { formatBytes } from "@/lib/utils";
import { getServerI18n } from "@/i18n/server";

function parsePositiveInteger(value: string | string[] | undefined, fallback: number) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getStatusMessage(searchParams: Record<string, string | string[] | undefined>, t: any) {
  const status = typeof searchParams.status === "string" ? searchParams.status : null;

  if (status === "success") {
    const items = typeof searchParams.items === "string" ? searchParams.items : "0";
    const hits = typeof searchParams.hits === "string" ? searchParams.hits : "0";
    const misses = typeof searchParams.misses === "string" ? searchParams.misses : "0";
    const label = typeof searchParams.label === "string" ? decodeURIComponent(searchParams.label) : "selection";
    return t("admin.ttsCache.statusMessages.success", { label, items, hits, misses });
  }

  if (status === "empty") {
    return t("admin.ttsCache.statusMessages.empty");
  }

  if (status === "too-many") {
    const count = typeof searchParams.count === "string" ? searchParams.count : "0";
    return t("admin.ttsCache.statusMessages.tooMany", { count });
  }

  if (status === "error") {
    return t("admin.ttsCache.statusMessages.error");
  }

  return null;
}

export default async function AdminTtsCachePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const { t } = await getServerI18n();
  const resolvedSearchParams = await searchParams;
  const staleDays = parsePositiveInteger(resolvedSearchParams.staleDays, 30);
  const staleLimit = parsePositiveInteger(resolvedSearchParams.staleLimit, 25);
  const overview = await getTtsCacheAdminOverview({ staleDays, staleLimit });
  const statusMessage = getStatusMessage(resolvedSearchParams, t);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.ttsCache.eyebrow")}
        title={t("admin.ttsCache.title")}
        description={t("admin.ttsCache.description")}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/admin/lessons">{t("admin.overview.sections.lessonsTitle")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/words">{t("admin.overview.sections.wordsTitle")}</Link>
            </Button>
          </div>
        }
      />

      {statusMessage ? (
        <div className="rounded-2xl border border-border/80 bg-card/90 px-4 py-3 text-sm text-foreground">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-muted-foreground">{t("admin.ttsCache.stats.cachedFiles")}</p>
              <p className="mt-2 text-3xl font-semibold">{overview.totalCachedFiles}</p>
            </div>
            <Database className="size-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-muted-foreground">{t("admin.ttsCache.stats.charactersGenerated")}</p>
              <p className="mt-2 text-3xl font-semibold">{overview.totalCharactersGenerated}</p>
            </div>
            <Volume2 className="size-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-muted-foreground">{t("admin.ttsCache.stats.estimatedHits")}</p>
              <p className="mt-2 text-3xl font-semibold">{overview.estimatedTotalHits}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("admin.ttsCache.stats.missesTracked", { count: overview.estimatedTotalMisses })}
              </p>
            </div>
            <Zap className="size-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-muted-foreground">{t("admin.ttsCache.stats.storageEstimate")}</p>
              <p className="mt-2 text-3xl font-semibold">{formatBytes(overview.totalStorageBytes)}</p>
            </div>
            <HardDrive className="size-6 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>{t("admin.ttsCache.pregenerate.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <form action={preGenerateTtsCacheAction} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="lessonId" className="text-sm font-medium text-foreground">
                  {t("admin.ttsCache.pregenerate.lessonLabel")}
                </label>
                <select
                  id="lessonId"
                  name="lessonId"
                  defaultValue=""
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t("admin.ttsCache.pregenerate.lessonPlaceholder")}</option>
                  {overview.lessonOptions.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.isPublished ? t("admin.status.published") : t("admin.status.draft")} · {lesson.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="wordEntries" className="text-sm font-medium text-foreground">
                  {t("admin.ttsCache.pregenerate.wordsLabel")}
                </label>
                <textarea
                  id="wordEntries"
                  name="wordEntries"
                  rows={5}
                  placeholder={t("admin.ttsCache.pregenerate.wordsPlaceholder")}
                  className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="exampleEntries" className="text-sm font-medium text-foreground">
                  {t("admin.ttsCache.pregenerate.examplesLabel")}
                </label>
                <textarea
                  id="exampleEntries"
                  name="exampleEntries"
                  rows={5}
                  placeholder={t("admin.ttsCache.pregenerate.examplesPlaceholder")}
                  className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <p>{t("admin.ttsCache.pregenerate.hint")}</p>
                <Button type="submit">{t("admin.ttsCache.pregenerate.submit")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>{t("admin.ttsCache.usage.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">{t("admin.ttsCache.usage.providers")}</p>
              {overview.providers.map((provider) => (
                <div key={provider.provider} className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{provider.provider}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {t("admin.ttsCache.usage.filesCount", { count: provider.files })}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{formatBytes(provider.storageBytes)}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">
                    {t("admin.ttsCache.usage.statsLine", {
                      characters: provider.characters,
                      hits: provider.hits,
                    })}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">{t("admin.ttsCache.usage.topVoices")}</p>
              {overview.voices.map((voice) => (
                <div key={`${voice.provider}:${voice.voice}`} className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{voice.voice}</p>
                      <p className="text-xs text-muted-foreground">{voice.provider}</p>
                    </div>
                    <Badge variant="outline">
                      {t("admin.ttsCache.usage.filesCount", { count: voice.files })}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("admin.ttsCache.usage.voiceStatsLine", {
                      characters: voice.characters,
                      hits: voice.hits,
                      size: formatBytes(voice.storageBytes),
                    })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>{t("admin.ttsCache.recent.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.recentEntries.length === 0 ? (
              <EmptyState
                title={t("admin.ttsCache.recent.emptyTitle")}
                description={t("admin.ttsCache.recent.emptyDescription")}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.ttsCache.recent.table.preview")}</TableHead>
                    <TableHead>{t("admin.ttsCache.recent.table.provider")}</TableHead>
                    <TableHead>{t("admin.ttsCache.recent.table.voice")}</TableHead>
                    <TableHead>{t("admin.ttsCache.recent.table.chars")}</TableHead>
                    <TableHead>{t("admin.ttsCache.recent.table.hits")}</TableHead>
                    <TableHead>{t("admin.ttsCache.recent.table.size")}</TableHead>
                    <TableHead className="text-right">{t("admin.ttsCache.recent.table.lastAccessed")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recentEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="max-w-[18rem] truncate text-sm text-foreground font-medium">
                          {entry.textPreview}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase">{entry.languageCode}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entry.provider}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.voice}</TableCell>
                      <TableCell className="text-sm">{entry.characterCount}</TableCell>
                      <TableCell className="text-sm">{entry.accessCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatBytes(entry.sizeBytes)}</TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm text-foreground">
                          {entry.lastAccessedAt ? new Date(entry.lastAccessedAt).toLocaleDateString() : t("admin.ttsCache.stale.neverAccessed")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.lastAccessedAt ? new Date(entry.lastAccessedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>{t("admin.ttsCache.stale.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form method="get" className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 flex-1">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">{t("admin.ttsCache.stale.daysLabel")}</span>
                  <input
                    type="number"
                    min={1}
                    name="staleDays"
                    defaultValue={overview.staleDays}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">{t("admin.ttsCache.stale.limitLabel")}</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    name="staleLimit"
                    defaultValue={staleLimit}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
              </div>
              <Button type="submit" variant="outline" className="h-11 w-full sm:w-auto">
                {t("admin.ttsCache.stale.refresh")}
              </Button>
            </form>

            {overview.staleEntries.length === 0 ? (
              <EmptyState
                title={t("admin.ttsCache.stale.emptyTitle")}
                description={t("admin.ttsCache.stale.emptyDescription")}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {overview.staleEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">{entry.provider}</Badge>
                      <span className="text-xs text-muted-foreground">{formatBytes(entry.sizeBytes)}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground line-clamp-2">{entry.textPreview}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("admin.ttsCache.stale.entryStats", {
                        voice: entry.voice,
                        hits: entry.accessCount,
                        date: entry.lastAccessedAt 
                          ? new Date(entry.lastAccessedAt).toLocaleDateString() 
                          : t("admin.ttsCache.stale.neverAccessed")
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
