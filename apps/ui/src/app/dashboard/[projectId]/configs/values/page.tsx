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

  // The redirect() call below MUST live outside the try block — Next signals
  // navigation by throwing a NEXT_REDIRECT, which a `catch {}` would swallow.
  let list: Awaited<ReturnType<typeof listAllConfigs>> = [];
  try {
    list = await listAllConfigs({
      projectId,
      actorEmail: session?.user?.email ?? "unknown",
      source: "jwt",
    });
  } catch {
    // DB unavailable in dev — fall through to empty state.
  }
  if (list.length > 0) {
    const byName = [...list].sort((a, b) => a.name.localeCompare(b.name));
    redirect(`/dashboard/${projectId}/configs/values/${byName[0].id}`);
  }

  return (
    <div className="p-6">
      <HeroEmptyState kind="configs" ctaHref={`/dashboard/${projectId}/configs/values/new`} />
    </div>
  );
}
