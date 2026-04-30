import { z } from "zod";

export const dashboardTimeRangeSchema = z.enum(["today", "7d", "30d", "90d", "1y"]);

export const userProgressTimeSeriesInputSchema = z.object({
  range: dashboardTimeRangeSchema.default("30d"),
});

export type DashboardTimeRange = z.infer<typeof dashboardTimeRangeSchema>;
export type UserProgressTimeSeriesInput = z.input<typeof userProgressTimeSeriesInputSchema>;
