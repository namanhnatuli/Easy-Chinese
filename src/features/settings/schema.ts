import { z } from "zod";

import { supportedLanguages } from "@/features/settings/types";
import { isSupportedTtsVoice } from "@/features/tts/catalog";

export const userSettingsSchema = z.object({
  language: z.enum(supportedLanguages),
  theme: z.enum(["light", "dark", "system"]),
  font: z.enum(["sans", "serif", "kai"]),
  ttsProvider: z.enum(["azure", "google"]),
  ttsVoice: z.string().trim().min(1).max(120),
  dailyGoal: z.number().int().min(1).max(200),
  schedulerType: z.enum(["sm2", "fsrs"]),
  desiredRetention: z.number().min(0.7).max(0.99),
  maximumIntervalDays: z.number().int().min(1).max(36500),
}).superRefine((value, ctx) => {
  if (!isSupportedTtsVoice(value.ttsProvider, value.ttsVoice)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Unsupported TTS voice for the selected provider.",
      path: ["ttsVoice"],
    });
  }
});
