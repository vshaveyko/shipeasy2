import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { getKillswitch } from "@/lib/handlers/killswitches";
import { Page, PageBody } from "@/components/dashboard/page";
import { LinkButton } from "@/components/ui/link-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ReadKillswitchView } from "../read-killswitch-view";
import type { KillswitchRow } from "../killswitches-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string; id: string }>;
}): Promise<Metadata> {
  const { projectId, id } = await params;
  try {
    const session = await auth();
    const ks = await getKillswitch(
      {
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      },
      id,
    );
    return { title: ks.name ? `Killswitch · ${ks.name}` : "Killswitch" };
  } catch {
    return { title: "Killswitch" };
  }
}

export default async function KillswitchDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; id: string }>;
}) {
  const { projectId: routeProjectId, id } = await params;
  const session = await auth();
  const projectId = session?.user?.project_id ?? routeProjectId;
  if (!projectId) notFound();

  const identity = {
    projectId,
    actorEmail: session?.user?.email ?? "unknown",
    source: "jwt" as const,
  };

  let row: KillswitchRow | null = null;
  try {
    row = (await getKillswitch(identity, id)) as KillswitchRow;
  } catch {
    // DB unavailable in dev OR killswitch not found
  }
  if (!row) notFound();

  const active = row.envs.prod ?? row.envs.staging ?? row.envs.dev;
  const on = Boolean(active?.value);

  return (
    <Page>
      <PageBody className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <LinkButton
            variant="ghost"
            size="sm"
            className="-ml-2"
            href={`/dashboard/${projectId}/killswitches`}
          >
            <ArrowLeft className="size-3.5" />
            Killswitches
          </LinkButton>
          <Link
            href={`/dashboard/${projectId}/killswitches?open=${row.id}`}
            className="text-[12px] text-[var(--se-fg-3)] hover:text-[var(--se-fg)]"
          >
            Open in list view
          </Link>
        </div>
        <div className="flex items-baseline gap-3 px-2">
          <h1 className="font-mono text-[20px] font-medium tracking-tight">{row.name}</h1>
          <StatusBadge tone={on ? "danger" : "success"}>{on ? "ON" : "OFF"}</StatusBadge>
        </div>
        {row.description ? (
          <p className="px-2 text-[13px] text-[var(--se-fg-2)]">{row.description}</p>
        ) : null}
        <ReadKillswitchView row={row} />
      </PageBody>
    </Page>
  );
}
