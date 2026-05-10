import type { Metadata } from "next";

import { auth } from "@/auth";
import { listAllConfigs } from "@/lib/handlers/configs";
import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Configs" };

export default async function ConfigValuesEmptyPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();

  try {
    const list = await listAllConfigs({
      projectId,
      actorEmail: session?.user?.email ?? "unknown",
      source: "jwt",
    });
    if (list.length > 0) {
      const byName = [...list].sort((a, b) => a.name.localeCompare(b.name));
      redirect(`/dashboard/${projectId}/configs/values/${byName[0].id}`);
    }
  } catch {
    // DB unavailable in dev — fall through to empty state.
  }

  return (
    <div className="p-6">
      <HeroEmptyState kind="configs" ctaHref={`/dashboard/${projectId}/configs/values/new`} />
    </div>
  );
}
