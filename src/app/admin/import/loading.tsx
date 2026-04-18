import { Skeleton } from "@/components/ui/skeleton";

export default function AdminImportLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-[2rem]" />
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Skeleton className="h-80 w-full rounded-[2rem]" />
        <div className="grid gap-4">
          <Skeleton className="h-36 w-full rounded-[2rem]" />
          <Skeleton className="h-44 w-full rounded-[2rem]" />
        </div>
      </div>
    </div>
  );
}
