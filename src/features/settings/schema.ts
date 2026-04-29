import { z } from "zod";

import { supportedLanguages } from "@/features/settings/types";

export const userSettingsSchema = z.object({
  language: z.enum(supportedLanguages),
  theme: z.enum(["light", "dark", "system"]),
  font: z.enum(["sans", "serif", "kai"]),
  schedulerType: z.enum(["sm2", "fsrs"]),
  desiredRetention: z.number().min(0.7).max(0.99),
  maximumIntervalDays: z.number().int().min(1).max(36500),
});
