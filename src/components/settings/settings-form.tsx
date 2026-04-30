"use client";

import { useState, useTransition } from "react";
import { Palette, Save, SlidersHorizontal, Type, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { dispatchPreferenceUpdate } from "@/components/settings/preferences-provider";
import { HeaderActions, HeaderLinkButton, PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSchedulerLabel,
  getFontLabel,
  getInitialUserSettings,
  normalizeLanguage,
  normalizeThemePreference,
  getTtsProviderLabel,
  getTtsVoiceOptions,
} from "@/features/settings/preferences";
import { useI18n } from "@/i18n/client";
import type { UserSettingsInput } from "@/features/settings/types";
import type { Profile } from "@/types/domain";

export function SettingsForm({
  profile,
  learningSettings,
}: {
  profile: Profile;
  learningSettings?: Partial<
    Pick<UserSettingsInput, "dailyGoal" | "schedulerType" | "desiredRetention" | "maximumIntervalDays">
  > | null;
}) {
  const { t, link } = useI18n();
  const [isSaving, startSaving] = useTransition();
  const [values, setValues] = useState<UserSettingsInput>(() => getInitialUserSettings(profile, learningSettings));
  const [savedValues, setSavedValues] = useState<UserSettingsInput>(() => getInitialUserSettings(profile, learningSettings));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasChanges =
    values.font !== savedValues.font ||
    values.ttsProvider !== savedValues.ttsProvider ||
    values.ttsVoice !== savedValues.ttsVoice ||
    values.dailyGoal !== savedValues.dailyGoal ||
    values.schedulerType !== savedValues.schedulerType ||
    values.desiredRetention !== savedValues.desiredRetention ||
    values.maximumIntervalDays !== savedValues.maximumIntervalDays;

  function updateField<Key extends keyof UserSettingsInput>(
    key: Key,
    value: UserSettingsInput[Key],
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
    setErrorMessage(null);
  }

  function handleSave() {
    startSaving(async () => {
      setErrorMessage(null);

      const payload = {
        ...values,
        language: normalizeLanguage(document.documentElement.lang),
        theme: normalizeThemePreference(document.documentElement.dataset.themePreference),
      } satisfies UserSettingsInput;

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        const message = body?.message ?? t("settings.saveError");
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      setValues(payload);
      setSavedValues(payload);
      dispatchPreferenceUpdate(payload);
      toast.success(t("settings.saveSuccess"));
    });
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("settings.eyebrow")}
        badge={t("common.authenticated")}
        title={t("settings.title")}
        description={t("settings.description")}
        actions={
          <HeaderActions
            secondary={<HeaderLinkButton href={link("/dashboard")} variant="outline">{t("common.dashboard")}</HeaderLinkButton>}
            primary={
              <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                <Save className="size-4" />
                {isSaving ? t("common.saving") : t("common.save")}
              </Button>
            }
          />
        }
      />

      {errorMessage ? (
        <Card className="border-destructive/30 bg-destructive/5" role="alert" aria-live="assertive">
          <CardHeader>
            <CardTitle className="text-base">{t("settings.saveError")}</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-4">
          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="size-4" />
                {t("settings.fontTitle")}
              </CardTitle>
              <CardDescription>
                {t("settings.fontDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="font-preference">{t("settings.fontTitle")}</Label>
              <Select value={values.font} onValueChange={(value) => updateField("font", value as UserSettingsInput["font"])}>
                <SelectTrigger id="font-preference" aria-describedby="font-help">
                  <SelectValue placeholder={t("settings.fontTitle")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sans">{t("settings.sans")}</SelectItem>
                  <SelectItem value="serif">{t("settings.serif")}</SelectItem>
                  <SelectItem value="kai">{t("settings.kai")}</SelectItem>
                </SelectContent>
              </Select>
              <p id="font-help" className="text-sm text-muted-foreground">
                {t("settings.fontHelp")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="size-4" />
                {t("settings.ttsTitle")}
              </CardTitle>
              <CardDescription>{t("settings.ttsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="tts-provider">{t("settings.ttsProviderLabel")}</Label>
                <Select
                  value={values.ttsProvider}
                  onValueChange={(value) => {
                    const nextProvider = value as UserSettingsInput["ttsProvider"];
                    const nextVoiceOptions = getTtsVoiceOptions(nextProvider);
                    const nextVoice = nextVoiceOptions.includes(values.ttsVoice)
                      ? values.ttsVoice
                      : nextVoiceOptions[0];

                    setValues((current) => ({
                      ...current,
                      ttsProvider: nextProvider,
                      ttsVoice: nextVoice,
                    }));
                    setErrorMessage(null);
                  }}
                >
                  <SelectTrigger id="tts-provider" aria-describedby="tts-provider-help">
                    <SelectValue placeholder={t("settings.ttsProviderLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="azure">{getTtsProviderLabel("azure")}</SelectItem>
                    <SelectItem value="google">{getTtsProviderLabel("google")}</SelectItem>
                  </SelectContent>
                </Select>
                <p id="tts-provider-help" className="text-sm text-muted-foreground">
                  {t("settings.ttsProviderHelp")}
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="tts-voice">{t("settings.ttsVoiceLabel")}</Label>
                <Select
                  value={values.ttsVoice}
                  onValueChange={(value) => updateField("ttsVoice", value)}
                >
                  <SelectTrigger id="tts-voice" aria-describedby="tts-voice-help">
                    <SelectValue placeholder={t("settings.ttsVoiceLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {getTtsVoiceOptions(values.ttsProvider).map((voice) => (
                      <SelectItem key={voice} value={voice}>
                        {voice}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p id="tts-voice-help" className="text-sm text-muted-foreground">
                  {t("settings.ttsVoiceHelp")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="size-4" />
                {t("settings.schedulerTitle")}
              </CardTitle>
              <CardDescription>{t("settings.schedulerDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="daily-goal">{t("settings.dailyGoal")}</Label>
                  <span className="text-sm font-medium text-foreground">{values.dailyGoal}</span>
                </div>
                <Input
                  id="daily-goal"
                  type="number"
                  min={1}
                  max={200}
                  step={1}
                  value={values.dailyGoal}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    updateField(
                      "dailyGoal",
                      Number.isFinite(nextValue) ? Math.max(1, Math.min(Math.round(nextValue), 200)) : 1,
                    );
                  }}
                  aria-describedby="daily-goal-help"
                />
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={Math.min(values.dailyGoal, 50)}
                  onChange={(event) => updateField("dailyGoal", Number(event.target.value))}
                  className="w-full accent-primary"
                  aria-label={t("settings.dailyGoal")}
                />
                <p id="daily-goal-help" className="text-sm text-muted-foreground">
                  {t("settings.dailyGoalHelp")}
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="scheduler-type">{t("settings.schedulerLabel")}</Label>
                <Select
                  value={values.schedulerType}
                  onValueChange={(value) => updateField("schedulerType", value as UserSettingsInput["schedulerType"])}
                >
                  <SelectTrigger id="scheduler-type" aria-describedby="scheduler-help">
                    <SelectValue placeholder={t("settings.schedulerLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm2">{t("settings.schedulerSm2")}</SelectItem>
                    <SelectItem value="fsrs">{t("settings.schedulerFsrs")}</SelectItem>
                  </SelectContent>
                </Select>
                <p id="scheduler-help" className="text-sm text-muted-foreground">
                  {t("settings.schedulerHelp")}
                </p>
                <p className="text-sm text-muted-foreground">{t("settings.hardMeaningHelp")}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="desired-retention">{t("settings.desiredRetention")}</Label>
                  <span className="text-sm font-medium text-foreground">{values.desiredRetention.toFixed(2)}</span>
                </div>
                <input
                  id="desired-retention"
                  type="range"
                  min="0.70"
                  max="0.99"
                  step="0.01"
                  value={values.desiredRetention}
                  onChange={(event) => updateField("desiredRetention", Number(event.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-sm text-muted-foreground">{t("settings.retentionHelp")}</p>
                {values.desiredRetention > 0.95 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">{t("settings.retentionWarning")}</p>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="maximum-interval">{t("settings.maximumInterval")}</Label>
                  <span className="text-sm font-medium text-foreground">{values.maximumIntervalDays}</span>
                </div>
                <input
                  id="maximum-interval"
                  type="range"
                  min="30"
                  max="36500"
                  step="1"
                  value={values.maximumIntervalDays}
                  onChange={(event) => updateField("maximumIntervalDays", Number(event.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-sm text-muted-foreground">{t("settings.maximumIntervalHelp")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="size-4" />
                {t("settings.liveSummary")}
              </CardTitle>
              <CardDescription>{t("settings.liveSummaryDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{getFontLabel(values.font)}</Badge>
                <Badge variant="secondary">{getTtsProviderLabel(values.ttsProvider)}</Badge>
                <Badge variant="secondary">{values.ttsVoice}</Badge>
                <Badge variant="secondary">{t("settings.dailyGoalBadge", { value: values.dailyGoal })}</Badge>
                <Badge variant="secondary">{getSchedulerLabel(values.schedulerType)}</Badge>
                <Badge variant="secondary">{t("settings.retentionBadge", { value: values.desiredRetention.toFixed(2) })}</Badge>
              </div>

              <div className="rounded-[1.5rem] border border-border/80 bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">{t("settings.previewCopy")}</p>
                <p className="mt-3 text-hanzi">你好</p>
                <p className="mt-2 text-pinyin">nǐ hǎo</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {t("settings.previewDescription")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>{t("settings.accountStatus")}</CardTitle>
              <CardDescription>{t("settings.accountDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                {t("settings.signedInAs", {
                  name: profile.displayName ?? profile.email ?? t("settings.learnerFallback"),
                })}{" "}
                <span className="font-medium text-foreground">{profile.displayName ?? profile.email ?? t("settings.learnerFallback")}</span>
              </p>
              <p>
                {t("settings.role", { value: profile.role })} <span className="font-medium text-foreground">{profile.role}</span>
              </p>
              <p>
                {t("settings.email", { value: profile.email ?? t("settings.unavailable") })}{" "}
                <span className="font-medium text-foreground">{profile.email ?? t("settings.unavailable")}</span>
              </p>
              <p>
                {t("settings.dailyGoalCurrent", { value: values.dailyGoal })}{" "}
                <span className="font-medium text-foreground">{values.dailyGoal}</span>
              </p>
              <p>
                {t("settings.schedulerCurrent", { value: getSchedulerLabel(values.schedulerType) })}{" "}
                <span className="font-medium text-foreground">{getSchedulerLabel(values.schedulerType)}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
