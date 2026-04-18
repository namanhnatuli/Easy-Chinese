import { SettingsForm } from "@/components/settings/settings-form";
import { requirePermission } from "@/lib/auth";

export default async function SettingsPage() {
  const context = await requirePermission("settings.read");
  const profile = context.profile;

  if (!profile) {
    throw new Error("Authenticated profile could not be loaded.");
  }

  return <SettingsForm profile={profile} />;
}
