"use client";

import { useState, useTransition } from "react";
import { Globe2, MoonStar, Palette, Save, Type } from "lucide-react";
import { toast } from "sonner";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { dispatchPreferenceUpdate } from "@/components/settings/preferences-provider";
import { HeaderActions, HeaderLinkButton, PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getFontLabel,
  getInitialUserSettings,
  getLanguageLabel,
  getThemeLabel,
} from "@/features/settings/preferences";
import { useI18n } from "@/i18n/client";
import type { UserSettingsInput } from "@/features/settings/types";
import type { Profile } from "@/types/domain";

export function SettingsForm({
  profile,
}: {
  profile: Profile;
}) {
  const { t, link } = useI18n();
  const [isSaving, startSaving] = useTransition();
  const [values, setValues] = useState<UserSettingsInput>(() => getInitialUserSettings(profile));
  const [savedValues, setSavedValues] = useState<UserSettingsInput>(() => getInitialUserSettings(profile));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasChanges =
    values.language !== savedValues.language ||
    values.theme !== savedValues.theme ||
    values.font !== savedValues.font;

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

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        const message = body?.message ?? t("settings.saveError");
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      setSavedValues(values);
      dispatchPreferenceUpdate(values);
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
                <Globe2 className="size-4" />
                {t("settings.languageTitle")}
              </CardTitle>
              <CardDescription>
                {t("settings.languageDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="language-preference">{t("settings.appLanguage")}</Label>
              <div id="language-preference">
                <LanguageSwitcher
                  authenticated
                  ariaLabel={t("settings.appLanguage")}
                  onLocaleChange={(language) => {
                    updateField("language", language);
                    setSavedValues((current) => ({
                      ...current,
                      language,
                    }));
                  }}
                />
              </div>
              <p id="language-help" className="text-sm text-muted-foreground">
                {t("settings.languageHelp")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MoonStar className="size-4" />
                {t("settings.themeTitle")}
              </CardTitle>
              <CardDescription>
                {t("settings.themeDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="theme-preference">{t("common.theme")}</Label>
              <Select value={values.theme} onValueChange={(value) => updateField("theme", value as UserSettingsInput["theme"])}>
                <SelectTrigger id="theme-preference" aria-describedby="theme-help">
                  <SelectValue placeholder={t("common.theme")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t("settings.system")}</SelectItem>
                  <SelectItem value="light">{t("settings.light")}</SelectItem>
                  <SelectItem value="dark">{t("settings.dark")}</SelectItem>
                </SelectContent>
              </Select>
              <p id="theme-help" className="text-sm text-muted-foreground">
                {t("settings.themeHelp")}
              </p>
            </CardContent>
          </Card>

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
              <Label htmlFor="font-preference">{t("common.font")}</Label>
              <Select value={values.font} onValueChange={(value) => updateField("font", value as UserSettingsInput["font"])}>
                <SelectTrigger id="font-preference" aria-describedby="font-help">
                  <SelectValue placeholder={t("common.font")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sans">{t("settings.sans")}</SelectItem>
                  <SelectItem value="serif">{t("settings.serif")}</SelectItem>
                </SelectContent>
              </Select>
              <p id="font-help" className="text-sm text-muted-foreground">
                {t("settings.fontHelp")}
              </p>
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
                <Badge variant="secondary">{getLanguageLabel(values.language)}</Badge>
                <Badge variant="secondary">{getThemeLabel(values.theme)}</Badge>
                <Badge variant="secondary">{getFontLabel(values.font)}</Badge>
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
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
