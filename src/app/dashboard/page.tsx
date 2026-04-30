import { DashboardOverview } from "@/components/progress/dashboard-overview";
import { dashboardTimeRangeSchema } from "@/features/progress/dashboard.schemas";
import { getDashboardData } from "@/features/progress/queries";
import { requirePermission } from "@/lib/auth";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("dashboard.read");
  const params = (await searchParams) ?? {};
  const requestedRange = typeof params.range === "string" ? params.range : undefined;
  const range = dashboardTimeRangeSchema.catch("30d").parse(requestedRange);
  const data = await getDashboardData(context.user!.id, { range });

  return <DashboardOverview data={data} selectedRange={range} />;
}
