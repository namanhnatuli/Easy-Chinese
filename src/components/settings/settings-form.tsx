"use client";

import { useState, useTransition } from "react";
import { Globe2, MoonStar, Palette, Save, Type } from "lucide-react";
import { toast } from "sonner";

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
import type { UserSettingsInput } from "@/features/settings/types";
import type { Profile } from "@/types/domain";

export function SettingsForm({
  profile,
}: {
  profile: Profile;
}) {
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
        const message = body?.message ?? "Settings could not be saved.";
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      setSavedValues(values);
      dispatchPreferenceUpdate(values);
      toast.success("Settings saved.");
    });
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Settings"
        badge="Authenticated"
        title="Preferences and reading comfort"
        description="Adjust language, theme, and reading style, then keep those preferences across your study and review surfaces."
        actions={
          <HeaderActions
            secondary={<HeaderLinkButton href="/dashboard" variant="outline">Dashboard</HeaderLinkButton>}
            primary={
              <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                <Save className="size-4" />
                {isSaving ? "Saving…" : "Save settings"}
              </Button>
            }
          />
        }
      />

      {errorMessage ? (
        <Card className="border-destructive/30 bg-destructive/5" role="alert" aria-live="assertive">
          <CardHeader>
            <CardTitle className="text-base">Settings could not be saved</CardTitle>
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
                Language preference
              </CardTitle>
              <CardDescription>
                Vietnamese stays the default today, with English-ready structure persisted for future expansion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="language-preference">App language</Label>
              <Select value={values.language} onValueChange={(value) => updateField("language", value as UserSettingsInput["language"])}>
                <SelectTrigger id="language-preference" aria-describedby="language-help">
                  <SelectValue placeholder="Choose language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                  <SelectItem value="en">English-ready</SelectItem>
                </SelectContent>
              </Select>
              <p id="language-help" className="text-sm text-muted-foreground">
                The stored preference already applies to document language and future i18n-ready surfaces.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MoonStar className="size-4" />
                Theme preference
              </CardTitle>
              <CardDescription>
                Choose a stable theme or follow the system appearance automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="theme-preference">Theme</Label>
              <Select value={values.theme} onValueChange={(value) => updateField("theme", value as UserSettingsInput["theme"])}>
                <SelectTrigger id="theme-preference" aria-describedby="theme-help">
                  <SelectValue placeholder="Choose theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
              <p id="theme-help" className="text-sm text-muted-foreground">
                Theme updates apply immediately after save and stay consistent across dashboard, review, and study pages.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="size-4" />
                Reading font
              </CardTitle>
              <CardDescription>
                Pick a reading style tuned for Chinese text, pinyin, and Vietnamese glosses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="font-preference">Font style</Label>
              <Select value={values.font} onValueChange={(value) => updateField("font", value as UserSettingsInput["font"])}>
                <SelectTrigger id="font-preference" aria-describedby="font-help">
                  <SelectValue placeholder="Choose font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sans">Modern Sans</SelectItem>
                  <SelectItem value="serif">Readable Serif</SelectItem>
                </SelectContent>
              </Select>
              <p id="font-help" className="text-sm text-muted-foreground">
                Sans keeps the interface crisp; serif adds extra reading contrast for longer vocabulary and grammar sessions.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="size-4" />
                Live summary
              </CardTitle>
              <CardDescription>What will be applied when you save.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{getLanguageLabel(values.language)}</Badge>
                <Badge variant="secondary">{getThemeLabel(values.theme)}</Badge>
                <Badge variant="secondary">{getFontLabel(values.font)}</Badge>
              </div>

              <div className="rounded-[1.5rem] border border-border/80 bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">Preview copy</p>
                <p className="mt-3 text-hanzi">你好</p>
                <p className="mt-2 text-pinyin">nǐ hǎo</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Xin chào. This preview is intentionally small, but the preference applies across the main reading and study surfaces after save.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>Account status</CardTitle>
              <CardDescription>Protected profile information remains server-backed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Signed in as <span className="font-medium text-foreground">{profile.displayName ?? profile.email ?? "Learner"}</span>
              </p>
              <p>
                Role: <span className="font-medium text-foreground">{profile.role}</span>
              </p>
              <p>
                Email: <span className="font-medium text-foreground">{profile.email ?? "Unavailable"}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
