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

function parsePositiveInteger(value: string | string[] | undefined, fallback: number) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getStatusMessage(searchParams: Record<string, string | string[] | undefined>) {
  const status = typeof searchParams.status === "string" ? searchParams.status : null;

  if (status === "success") {
    const items = typeof searchParams.items === "string" ? searchParams.items : "0";
    const hits = typeof searchParams.hits === "string" ? searchParams.hits : "0";
    const misses = typeof searchParams.misses === "string" ? searchParams.misses : "0";
    const label = typeof searchParams.label === "string" ? decodeURIComponent(searchParams.label) : "selection";
    return `${label}: pre-generated ${items} items (${hits} hits, ${misses} misses).`;
  }

  if (status === "empty") {
    return "No lesson, word, or example targets were provided.";
  }

  if (status === "too-many") {
    const count = typeof searchParams.count === "string" ? searchParams.count : "0";
    return `Pre-generation batch too large (${count} items). Reduce the selection and try again.`;
  }

  if (status === "error") {
    return "Pre-generation failed. Check server logs for the provider error details.";
  }

  return null;
}

export default async function AdminTtsCachePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const resolvedSearchParams = await searchParams;
  const staleDays = parsePositiveInteger(resolvedSearchParams.staleDays, 30);
  const staleLimit = parsePositiveInteger(resolvedSearchParams.staleLimit, 25);
  const overview = await getTtsCacheAdminOverview({ staleDays, staleLimit });
  const statusMessage = getStatusMessage(resolvedSearchParams);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Audio Operations"
        title="TTS Cache"
        description="Review cached pronunciation audio, pre-generate new items through the same cache-first flow, and inspect old entries before any cleanup work."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/admin/lessons">Lessons</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/words">Words</Link>
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
              <p className="text-sm text-muted-foreground">Cached files</p>
              <p className="mt-2 text-3xl font-semibold">{overview.totalCachedFiles}</p>
            </div>
            <Database className="size-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-muted-foreground">Characters generated</p>
              <p className="mt-2 text-3xl font-semibold">{overview.totalCharactersGenerated}</p>
            </div>
            <Volume2 className="size-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-muted-foreground">Estimated cache hits</p>
              <p className="mt-2 text-3xl font-semibold">{overview.estimatedTotalHits}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Misses tracked as generated rows: {overview.estimatedTotalMisses}
              </p>
            </div>
            <Zap className="size-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-muted-foreground">Storage estimate</p>
              <p className="mt-2 text-3xl font-semibold">{formatBytes(overview.totalStorageBytes)}</p>
            </div>
            <HardDrive className="size-6 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Pre-generate cache</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <form action={preGenerateTtsCacheAction} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="lessonId" className="text-sm font-medium text-foreground">
                  Selected lesson
                </label>
                <select
                  id="lessonId"
                  name="lessonId"
                  defaultValue=""
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">No lesson selected</option>
                  {overview.lessonOptions.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.isPublished ? "Published" : "Draft"} · {lesson.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="wordEntries" className="text-sm font-medium text-foreground">
                  Selected words
                </label>
                <textarea
                  id="wordEntries"
                  name="wordEntries"
                  rows={5}
                  placeholder="One word id, slug, or Hanzi per line"
                  className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="exampleEntries" className="text-sm font-medium text-foreground">
                  Selected examples
                </label>
                <textarea
                  id="exampleEntries"
                  name="exampleEntries"
                  rows={5}
                  placeholder="One example id or Chinese sentence per line"
                  className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <p>Runs the same cache-first service used by `/api/tts` and stops if more than 100 unique items are submitted.</p>
                <Button type="submit">Pre-generate</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Provider and voice usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Providers</p>
              {overview.providers.map((provider) => (
                <div key={provider.provider} className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{provider.provider}</Badge>
                      <span className="text-sm text-muted-foreground">{provider.files} files</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{formatBytes(provider.storageBytes)}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{provider.characters} characters · {provider.hits} hits</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Top voices</p>
              {overview.voices.map((voice) => (
                <div key={`${voice.provider}:${voice.voice}`} className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{voice.voice}</p>
                      <p className="text-xs text-muted-foreground">{voice.provider}</p>
                    </div>
                    <Badge variant="outline">{voice.files} files</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {voice.characters} characters · {voice.hits} hits · {formatBytes(voice.storageBytes)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Recent cache entries</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.recentEntries.length === 0 ? (
              <EmptyState
                title="No cached audio yet"
                description="Generate pronunciation audio from study surfaces or the pre-generation tool first."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Voice</TableHead>
                    <TableHead>Chars</TableHead>
                    <TableHead>Hits</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Last accessed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recentEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="max-w-[18rem] truncate text-sm text-foreground">{entry.textPreview}</div>
                        <div className="text-xs text-muted-foreground">{entry.languageCode}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entry.provider}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.voice}</TableCell>
                      <TableCell>{entry.characterCount}</TableCell>
                      <TableCell>{entry.accessCount}</TableCell>
                      <TableCell>{formatBytes(entry.sizeBytes)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {entry.lastAccessedAt ? new Date(entry.lastAccessedAt).toLocaleString() : "Never"}
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
            <CardTitle>Old unused candidates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Unused for days</span>
                <input
                  type="number"
                  min={1}
                  name="staleDays"
                  defaultValue={overview.staleDays}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Candidate limit</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  name="staleLimit"
                  defaultValue={staleLimit}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <div className="flex items-end">
                <Button type="submit" variant="outline" className="h-11">Refresh</Button>
              </div>
            </form>

            {overview.staleEntries.length === 0 ? (
              <EmptyState
                title="No stale candidates"
                description="Nothing currently falls outside the selected last-access window."
              />
            ) : (
              <div className="space-y-3">
                {overview.staleEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">{entry.provider}</Badge>
                      <span className="text-xs text-muted-foreground">{formatBytes(entry.sizeBytes)}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{entry.textPreview}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.voice} · hits {entry.accessCount} · last accessed{" "}
                      {entry.lastAccessedAt ? new Date(entry.lastAccessedAt).toLocaleDateString() : "never"}
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
