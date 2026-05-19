import { ListPageSkeleton } from "@/components/dashboard/list-skeleton";

export default function Loading() {
  return (
    <ListPageSkeleton
      title="API keys"
      description="Server, client, and admin keys are scoped separately. Generate one per environment and rotate often."
      columns={5}
      rows={4}
      showToolbar={false}
    />
  );
}
