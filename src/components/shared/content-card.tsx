import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function ContentCard({
  title,
  description,
  meta,
  badge,
  href,
  ctaLabel,
}: {
  title: string;
  description: string;
  meta: string[];
  badge?: string;
  href: string;
  ctaLabel: string;
}) {
  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader className="gap-4">
        <div className="flex items-center justify-between gap-3">
          {badge ? <Badge variant="secondary">{badge}</Badge> : <span />}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        {meta.map((item) => (
          <span key={item} className="rounded-full bg-muted px-3 py-1">
            {item}
          </span>
        ))}
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href={href}>
            {ctaLabel}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
