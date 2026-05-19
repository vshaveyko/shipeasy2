import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-7">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-[180px]" />
        <Skeleton className="h-7 w-[200px]" />
        <Skeleton className="h-3 w-[420px]" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-[var(--radius-lg)]" />
        ))}
      </div>
      <Skeleton className="h-[260px] w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}
