import { z } from "zod";

import { supportedLanguages } from "@/features/settings/types";

export const userSettingsSchema = z.object({
  language: z.enum(supportedLanguages),
  theme: z.enum(["light", "dark", "system"]),
  font: z.enum(["sans", "serif"]),
});
