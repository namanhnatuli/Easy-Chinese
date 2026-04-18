import { DashboardOverview } from "@/components/progress/dashboard-overview";
import { getDashboardData } from "@/features/progress/queries";
import { requirePermission } from "@/lib/auth";

export default async function DashboardPage() {
  const context = await requirePermission("dashboard.read");
  const data = await getDashboardData(context.user!.id);

  return <DashboardOverview data={data} />;
}
