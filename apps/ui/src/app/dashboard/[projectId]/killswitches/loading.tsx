import { ListPageSkeleton } from "@/components/dashboard/list-skeleton";

export default function Loading() {
  return (
    <ListPageSkeleton
      title="Killswitches"
      description="Static on/off configs delivered as-is to the client. Each can carry per-key overrides that take precedence over the default value."
      columns={6}
      rows={6}
    />
  );
}
