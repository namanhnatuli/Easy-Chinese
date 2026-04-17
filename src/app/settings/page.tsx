import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function SettingsPage() {
  await requirePermission("settings.read");

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Settings"
        badge="Authenticated"
        title="Preferences and reading comfort"
        description="This page is still a shell functionally, but it now previews how language, theme, and typography settings will be organized."
      />

      <Tabs defaultValue="appearance">
        <TabsList>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="language">Language</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        <TabsContent value="appearance">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Theme preference</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Light, dark, and system theme support belong to phase 8.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Reading font</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Font controls will let learners optimize readability for Hanzi, pinyin, and Vietnamese glosses.
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="language">
          <Card>
            <CardHeader>
              <CardTitle>Preferred language</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Profile-backed language preferences are planned for the settings phase.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account controls</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Protected profile actions will stay server-backed and role-aware.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
