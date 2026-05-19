import { ListPageSkeleton } from "@/components/dashboard/list-skeleton";

export default function Loading() {
  return (
    <ListPageSkeleton
      title="Configs"
      description="Schema-driven configuration with per-environment publishing."
      columns={6}
      rows={8}
    />
  );
}
