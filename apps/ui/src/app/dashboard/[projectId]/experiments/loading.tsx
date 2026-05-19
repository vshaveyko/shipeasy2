import { ListPageSkeleton } from "@/components/dashboard/list-skeleton";

export default function Loading() {
  return (
    <ListPageSkeleton
      title="Experiments"
      description="A/B test anything with continuous significance, live verdicts, and one-click ship/kill."
      columns={7}
      rows={8}
    />
  );
}
