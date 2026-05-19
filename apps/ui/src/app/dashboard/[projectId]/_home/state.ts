import { and, desc, eq, gte } from "drizzle-orm";

import { listAllConfigs } from "@/lib/handlers/configs";
import { listAllExperiments } from "@/lib/handlers/experiments";
import { listAllGates } from "@/lib/handlers/gates";
import { listProfiles } from "@/lib/handlers/i18n";
import { getProject } from "@/lib/handlers/projects";
import { getEnvAsync } from "@/lib/env";
import { getDb, getEffectivePlan } from "@shipeasy/core";
import { auditLog } from "@shipeasy/core/db/schema";

export type HomeStateKind = "first-run" | "quiet" | "busy";

export interface HomeActivityEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorEmail: string;
  actorType: "user" | "cli" | "system";
  createdAt: string;
}

export interface HomeState {
  kind: HomeStateKind;
  counts: {
    gates: number;
    configs: number;
    experiments: number;
    runningExperiments: number;
    profiles: number;
  };
  decisions: HomeDecision[];
  liveExperiments: { id: string; name: string; status: string }[];
  /** Events-per-hour over the last 24h. Index 0 = oldest, 23 = current hour. */
  pulse24h: number[];
  /** Most recent audit events (oldest first → latest last). Capped at 12. */
  activity: HomeActivityEntry[];
  projectName: string | null;
  planName: string;
}

export interface HomeDecision {
  id: string;
  name: string;
  /** Reason this needs attention. Drives the decision-card eyebrow copy. */
  kind: "ship" | "extend" | "stop" | "review";
  description: string;
}

/**
 * Server-side cockpit state. Discriminates first-run / quiet / busy from
 * counts that are already cheap to compute. Heavy alert / verdict signals
 * (sig reached, p99 breach) plug in here once their data sources land.
 */
export async function loadHomeState(projectId: string, actorEmail: string): Promise<HomeState> {
  const identity = { projectId, actorEmail, source: "jwt" as const };

  const [gates, configs, experiments, profiles, project, recentActivity] = await Promise.all([
    listAllGates(identity).catch(() => [] as Awaited<ReturnType<typeof listAllGates>>),
    listAllConfigs(identity).catch(() => [] as Awaited<ReturnType<typeof listAllConfigs>>),
    listAllExperiments(identity).catch(() => [] as Awaited<ReturnType<typeof listAllExperiments>>),
    listProfiles(identity).catch(() => [] as Awaited<ReturnType<typeof listProfiles>>),
    getProject(identity, projectId).catch(() => null),
    fetchRecentActivity(projectId).catch(() => [] as HomeActivityEntry[]),
  ]);

  const running = experiments.filter((e) => e.status === "running");
  const totalRecords = gates.length + configs.length + experiments.length;

  let kind: HomeStateKind;
  if (totalRecords === 0) {
    kind = "first-run";
  } else if (running.length > 0) {
    kind = "busy";
  } else {
    kind = "quiet";
  }

  // Synthesise decisions from running experiments. Once verdict + sig data
  // hangs off the row, replace this with the real "ready to ship" signal.
  const decisions: HomeDecision[] = running.slice(0, 3).map((exp) => ({
    id: exp.id,
    name: exp.name,
    kind: "review",
    description: "Live and collecting samples.",
  }));

  const liveExperiments = running.slice(0, 6).map((exp) => ({
    id: exp.id,
    name: exp.name,
    status: exp.status,
  }));

  const planName = project ? (getEffectivePlan(project).display_name ?? "Free") : "Free";

  const pulse24h = bucketPulse(recentActivity);

  return {
    kind,
    counts: {
      gates: gates.length,
      configs: configs.length,
      experiments: experiments.length,
      runningExperiments: running.length,
      profiles: profiles.length,
    },
    decisions,
    liveExperiments,
    pulse24h,
    activity: recentActivity.slice(0, 12),
    projectName: project?.name ?? null,
    planName,
  };
}

async function fetchRecentActivity(projectId: string): Promise<HomeActivityEntry[]> {
  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      actorEmail: auditLog.actorEmail,
      actorType: auditLog.actorType,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(and(eq(auditLog.projectId, projectId), gte(auditLog.createdAt, since)))
    .orderBy(desc(auditLog.createdAt))
    .limit(120);
  return rows as HomeActivityEntry[];
}

function bucketPulse(activity: HomeActivityEntry[]): number[] {
  const buckets = Array.from({ length: 24 }, () => 0);
  const now = Date.now();
  for (const entry of activity) {
    const t = Date.parse(entry.createdAt);
    if (Number.isNaN(t)) continue;
    const hoursAgo = Math.floor((now - t) / 3_600_000);
    if (hoursAgo < 0 || hoursAgo >= 24) continue;
    const idx = 23 - hoursAgo;
    buckets[idx] = (buckets[idx] ?? 0) + 1;
  }
  return buckets;
}
