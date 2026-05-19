import { ListPageSkeleton } from "@/components/dashboard/list-skeleton";

export default function Loading() {
  return (
    <ListPageSkeleton
      title="Metrics"
      description="Web vitals and errors are auto-collected by the SDK. Add custom events with a single track() call."
      columns={6}
      rows={6}
    />
  );
}
