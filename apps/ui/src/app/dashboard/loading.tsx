import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-7">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-[180px]" />
        <Skeleton className="h-7 w-[200px]" />
        <Skeleton className="h-3 w-[420px]" />
      </div>
      <Skeleton className="h-[160px] w-full rounded-[var(--radius-lg)]" />
      <Skeleton className="h-[260px] w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}
