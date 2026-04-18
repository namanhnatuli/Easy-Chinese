import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="page-shell">
      <div className="space-y-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>

      <div className="rounded-[2rem] border border-border/40 bg-card/20 p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-6 h-2 w-full" />
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_20rem]">
          <Skeleton className="h-[28rem] rounded-[1.75rem]" />
          <Skeleton className="h-[28rem] rounded-[1.75rem]" />
        </div>
      </div>
    </div>
  );
}
