import { ListPageSkeleton } from "@/components/dashboard/list-skeleton";

export default function Loading() {
  return (
    <ListPageSkeleton
      title="Gates"
      description="Gates toggle features on and off per user, attribute, or percentage."
      columns={6}
      rows={8}
    />
  );
}
