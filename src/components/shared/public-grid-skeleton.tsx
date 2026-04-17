import { Skeleton } from "@/components/ui/skeleton";

export function PublicGridSkeleton({
  cards = 4,
}: {
  cards?: number;
}) {
  return (
    <div className="page-shell">
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-96 max-w-full" />
        <Skeleton className="h-5 w-[34rem] max-w-full" />
      </div>

      <div className="rounded-[1.75rem] border border-border/60 bg-card/80 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-4 h-9 w-40" />
            <Skeleton className="mt-3 h-4 w-52" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
            <div className="mt-6 flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
