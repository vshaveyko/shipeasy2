import { notFound } from "next/navigation";

import { auth } from "@/auth";
import {
  getConfig,
  listConfigActivity,
  type ConfigDetail,
  type ConfigActivity,
} from "@/lib/handlers/configs";
import { ConfigEditor } from "./editor";

export default async function ConfigDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const projectId = session?.user?.project_id;
  if (!projectId) notFound();

  const identity = {
    projectId,
    actorEmail: session?.user?.email ?? "unknown",
    source: "jwt" as const,
  };

  let detail: ConfigDetail | null = null;
  let activity: ConfigActivity[] = [];
  try {
    detail = await getConfig(identity, id);
    activity = await listConfigActivity(identity, id, 20);
  } catch {
    // DB unavailable in dev OR config not found — let notFound handle it below
  }

  if (!detail) notFound();

  return <ConfigEditor initial={detail} initialActivity={activity} />;
}
