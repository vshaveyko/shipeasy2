"use client";

import useSWR from "swr";

import { Skeleton } from "@/components/ui/skeleton";
import type { ConfigActivity, ConfigDetail } from "@/lib/handlers/configs";
import { ConfigEditorBody } from "./[id]/editor";

const detailFetcher = async (url: string): Promise<ConfigDetail> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as ConfigDetail;
};

const activityFetcher = async (url: string): Promise<ConfigActivity[]> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) return [];
  return (await res.json()) as ConfigActivity[];
};

export function EmbeddedConfigEditor({
  configId,
  onDeleted,
}: {
  configId: string;
  onDeleted: () => void;
}) {
  const { data: detail, isLoading } = useSWR<ConfigDetail>(
    `/api/admin/configs/${configId}`,
    detailFetcher,
    { dedupingInterval: 0 },
  );
  const { data: activity } = useSWR<ConfigActivity[]>(
    `/api/admin/configs/${configId}/activity`,
    activityFetcher,
    { dedupingInterval: 0 },
  );

  if (isLoading || !detail) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 px-6 py-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-[140px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <ConfigEditorBody
      key={detail.id}
      initial={detail}
      initialActivity={activity ?? []}
      hideCrumb
      onDeleted={onDeleted}
    />
  );
}
