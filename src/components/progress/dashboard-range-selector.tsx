import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerI18n } from "@/i18n/server";

import type { DashboardTimeRange } from "@/features/progress/dashboard.schemas";

const RANGE_OPTIONS: DashboardTimeRange[] = ["today", "7d", "30d", "90d", "1y"];

export async function DashboardRangeSelector({
  selectedRange,
}: {
  selectedRange: DashboardTimeRange;
}) {
  const { t, link } = await getServerI18n();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{t("dashboard.timeRangeLabel")}</Badge>
      {RANGE_OPTIONS.map((range) => (
        <Button key={range} asChild size="sm" variant={range === selectedRange ? "default" : "outline"}>
          <Link
            href={link(`/dashboard?range=${range}`)}
            aria-current={range === selectedRange ? "page" : undefined}
          >
            {t(`dashboard.rangeOptions.${range}` as "dashboard.rangeOptions.30d")}
          </Link>
        </Button>
      ))}
    </div>
  );
}
