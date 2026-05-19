import { and, desc, eq, gte, inArray } from "drizzle-orm";

import { listAllConfigs } from "@/lib/handlers/configs";
import { listAllExperiments } from "@/lib/handlers/experiments";
import { listAllGates } from "@/lib/handlers/gates";
import { listAllKillswitches, type KillswitchSummary } from "@/lib/handlers/killswitches";
import { listProfiles } from "@/lib/handlers/i18n";
import { getProject } from "@/lib/handlers/projects";
import { getEnvAsync } from "@/lib/env";
import { getDb, getEffectivePlan } from "@shipeasy/core";
import {
  auditLog,
  experimentMetrics,
  experimentResults,
  metrics as metricsTbl,
} from "@shipeasy/core/db/schema";

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

export interface ExperimentSummary {
  id: string;
  name: string;
  status: string;
  startedAt: string | null;
  primaryMetric: string | null;
  /** Treatment-vs-control lift on the primary metric (%). Null when no results. */
  liftPct: number | null;
  ci95Low: number | null;
  ci95High: number | null;
  /** 1 - p-value, capped at 99.99. Null when no results. */
  significancePct: number | null;
  pValue: number | null;
  sampleN: number | null;
  /** 12-day daily delta_pct series. Empty when no history. */
  spark: number[];
  srmDetected: boolean;
  peekWarning: boolean;
  isFinal: boolean;
  ownerEmail: string | null;
  ownerInitial: string | null;
  ownerColor: string;
}

export interface AlertItem {
  id: string;
  severity: "danger" | "warn" | "info";
  title: string;
  detail: string;
  when: string;
  href: string;
}

export interface HomeState {
  kind: HomeStateKind;
  counts: {
    gates: number;
    configs: number;
    experiments: number;
    runningExperiments: number;
    killswitches: number;
    armedKillswitches: number;
    profiles: number;
  };
  /** Decision-grade running experiments — ready-to-ship / extend / review. */
  decisions: ExperimentSummary[];
  /** All running experiments with their latest verdict snapshot. */
  liveExperiments: ExperimentSummary[];
  /** Real audit-driven alerts (SRM, peek warning, killswitch armed). */
  alerts: AlertItem[];
  /** Events-per-hour over the last 24h. Index 0 = oldest, 23 = current hour. */
  pulse24h: number[];
  /** Most recent audit events (latest first). Capped at 12. */
  activity: HomeActivityEntry[];
  projectName: string | null;
  planName: string;
}

const OWNER_COLORS = ["#7c5cff", "#00d08a", "#ff8445", "#3b82f6", "#22a06b", "#ec4899", "#06b6d4"];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function ownerForEmail(email: string | null): {
  email: string | null;
  initial: string | null;
  color: string;
} {
  if (!email) return { email: null, initial: null, color: "#7a7a82" };
  const local = (email.split("@")[0] ?? "?").replace(/[^a-zA-Z]/g, "");
  const initial = (local[0] ?? "?").toUpperCase();
  const color = OWNER_COLORS[hashStr(email) % OWNER_COLORS.length]!;
  return { email, initial, color };
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export async function loadHomeState(projectId: string, actorEmail: string): Promise<HomeState> {
  const identity = { projectId, actorEmail, source: "jwt" as const };

  const [gates, configRows, killswitchRows, allExperiments, profiles, project, recentActivity] =
    await Promise.all([
      listAllGates(identity).catch(() => [] as Awaited<ReturnType<typeof listAllGates>>),
      listAllConfigs(identity).catch(() => [] as Awaited<ReturnType<typeof listAllConfigs>>),
      listAllKillswitches(identity).catch(
        () => [] as Awaited<ReturnType<typeof listAllKillswitches>>,
      ),
      listAllExperiments(identity).catch(
        () => [] as Awaited<ReturnType<typeof listAllExperiments>>,
      ),
      listProfiles(identity).catch(() => [] as Awaited<ReturnType<typeof listProfiles>>),
      getProject(identity, projectId).catch(() => null),
      fetchRecentActivity(projectId).catch(() => [] as HomeActivityEntry[]),
    ]);

  const realConfigs = configRows;
  const running = allExperiments.filter((e) => e.status === "running");

  // Last-actor lookup per resource (audit log within 30 days). Used for owner
  // avatars on tiles and decision cards.
  const lastActorByRecord = await fetchLastActorByRecord(projectId).catch(
    () => new Map<string, string>(),
  );

  // Real verdict snapshots for running experiments.
  const summariesById = await fetchExperimentSummaries(
    projectId,
    running.map((e) => ({
      id: e.id,
      name: e.name,
      status: e.status,
      startedAt: e.startedAt ?? null,
    })),
    lastActorByRecord,
  ).catch(() => new Map<string, ExperimentSummary>());

  const liveExperiments: ExperimentSummary[] = running
    .map((e) => summariesById.get(e.id))
    .filter((s): s is ExperimentSummary => !!s);

  // Decisions = experiments with a verdict signal. Rank ship > review > extend.
  const ranked = liveExperiments
    .map((s) => ({ s, rank: verdictRank(s) }))
    .filter((x) => x.rank > 0)
    .sort((a, b) => b.rank - a.rank);
  const decisions = ranked.slice(0, 3).map((x) => x.s);

  // Real alerts derived from current data — no synthetic placeholders.
  const alerts = buildAlerts(killswitchRows, liveExperiments, recentActivity);

  // Synthesize cockpit state kind from real data.
  const totalRecords = gates.length + realConfigs.length + allExperiments.length;
  let kind: HomeStateKind;
  if (totalRecords === 0) kind = "first-run";
  else if (running.length > 0 || alerts.length > 0) kind = "busy";
  else kind = "quiet";

  const planName = project ? (getEffectivePlan(project).display_name ?? "Free") : "Free";
  const pulse24h = bucketPulse(recentActivity);

  return {
    kind,
    counts: {
      gates: gates.length,
      configs: realConfigs.length,
      experiments: allExperiments.length,
      runningExperiments: running.length,
      killswitches: killswitchRows.length,
      armedKillswitches: killswitchRows.filter((k) => isKillswitchArmed(k)).length,
      profiles: profiles.length,
    },
    decisions,
    liveExperiments,
    alerts,
    pulse24h,
    activity: recentActivity.slice(0, 12),
    projectName: project?.name ?? null,
    planName,
  };
}

function verdictRank(s: ExperimentSummary): number {
  if (s.srmDetected) return 90; // urgent — assignment broken
  if (s.peekWarning) return 80;
  if (s.isFinal) return 70;
  if (s.significancePct !== null && s.significancePct >= 95 && s.liftPct !== null) {
    return s.liftPct >= 0 ? 60 : 65; // ready to ship vs. kill
  }
  if (s.significancePct !== null && s.significancePct >= 80) return 40; // trending
  return 0;
}

function isKillswitchArmed(k: KillswitchSummary): boolean {
  // Armed when any published env value is true OR any per-switch override is true.
  for (const env of Object.values(k.envs)) {
    if (!env) continue;
    if (env.value === true) return true;
    const switches = env.switches as Record<string, boolean> | undefined;
    if (switches && Object.values(switches).some(Boolean)) return true;
  }
  return false;
}

async function fetchExperimentSummaries(
  projectId: string,
  exps: Array<{ id: string; name: string; status: string; startedAt: string | null }>,
  lastActor: Map<string, string>,
): Promise<Map<string, ExperimentSummary>> {
  const out = new Map<string, ExperimentSummary>();
  if (exps.length === 0) return out;

  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const ids = exps.map((e) => e.id);

  // Goal metrics per experiment (role='goal'). Pull metric ids + metric name.
  const goalRows = await db
    .select({
      experimentId: experimentMetrics.experimentId,
      metricName: metricsTbl.name,
    })
    .from(experimentMetrics)
    .innerJoin(metricsTbl, eq(metricsTbl.id, experimentMetrics.metricId))
    .where(and(inArray(experimentMetrics.experimentId, ids), eq(experimentMetrics.role, "goal")));
  const goalByExp = new Map<string, string>();
  for (const r of goalRows) {
    if (!goalByExp.has(r.experimentId)) goalByExp.set(r.experimentId, r.metricName);
  }

  // Recent results — last 30 days max so we can plot a 12-pt spark.
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const expNames = exps.map((e) => e.name);
  const resultRows =
    expNames.length > 0
      ? await db
          .select({
            experiment: experimentResults.experiment,
            metric: experimentResults.metric,
            groupName: experimentResults.groupName,
            ds: experimentResults.ds,
            n: experimentResults.n,
            deltaPct: experimentResults.deltaPct,
            ci95Low: experimentResults.ci95Low,
            ci95High: experimentResults.ci95High,
            pValue: experimentResults.pValue,
            srmDetected: experimentResults.srmDetected,
            peekWarning: experimentResults.peekWarning,
            isFinal: experimentResults.isFinal,
          })
          .from(experimentResults)
          .where(
            and(
              eq(experimentResults.projectId, projectId),
              inArray(experimentResults.experiment, expNames),
              gte(experimentResults.ds, since),
            ),
          )
      : [];

  // Index: experiment → primary metric → ds → row (treatment group preferred).
  for (const exp of exps) {
    const primary = goalByExp.get(exp.id) ?? null;
    const owner = ownerForEmail(lastActor.get(`experiment:${exp.id}`) ?? null);

    if (!primary) {
      out.set(exp.id, {
        id: exp.id,
        name: exp.name,
        status: exp.status,
        startedAt: exp.startedAt,
        primaryMetric: null,
        liftPct: null,
        ci95Low: null,
        ci95High: null,
        significancePct: null,
        pValue: null,
        sampleN: null,
        spark: [],
        srmDetected: false,
        peekWarning: false,
        isFinal: false,
        ownerEmail: owner.email,
        ownerInitial: owner.initial,
        ownerColor: owner.color,
      });
      continue;
    }

    const rows = resultRows.filter(
      (r) => r.experiment === exp.name && r.metric === primary && r.groupName !== "control",
    );
    const sorted = rows.sort((a, b) => (a.ds < b.ds ? -1 : 1));
    const spark = sorted
      .map((r) => r.deltaPct)
      .filter((v): v is number => v != null)
      .slice(-12);
    const latest = sorted[sorted.length - 1];

    out.set(exp.id, {
      id: exp.id,
      name: exp.name,
      status: exp.status,
      startedAt: exp.startedAt,
      primaryMetric: primary,
      liftPct: latest?.deltaPct ?? null,
      ci95Low: latest?.ci95Low ?? null,
      ci95High: latest?.ci95High ?? null,
      significancePct: latest?.pValue != null ? Math.min(99.99, (1 - latest.pValue) * 100) : null,
      pValue: latest?.pValue ?? null,
      sampleN: latest?.n ?? null,
      spark,
      srmDetected: !!latest?.srmDetected,
      peekWarning: !!latest?.peekWarning,
      isFinal: !!latest?.isFinal,
      ownerEmail: owner.email,
      ownerInitial: owner.initial,
      ownerColor: owner.color,
    });
  }

  return out;
}

function buildAlerts(
  killswitches: KillswitchSummary[],
  liveExperiments: ExperimentSummary[],
  activity: HomeActivityEntry[],
): AlertItem[] {
  const alerts: AlertItem[] = [];

  // Armed killswitches — surface each with last flip time from audit log.
  const recentFlips = new Map<string, string>();
  for (const a of activity) {
    if (a.resourceType !== "config" && a.resourceType !== "killswitch") continue;
    if (a.action !== "update" && a.action !== "create") continue;
    if (!a.resourceId) continue;
    if (!recentFlips.has(a.resourceId)) recentFlips.set(a.resourceId, a.createdAt);
  }
  for (const k of killswitches) {
    if (!isKillswitchArmed(k)) continue;
    const when = recentFlips.get(k.id) ?? k.updatedAt;
    alerts.push({
      id: `ks:${k.id}`,
      severity: "danger",
      title: `Killswitch ${k.name} armed`,
      detail: `flipped ${relativeTime(when)}`,
      when: relativeTime(when),
      href: `./killswitches?open=${k.id}`,
    });
  }

  for (const s of liveExperiments) {
    if (s.srmDetected) {
      alerts.push({
        id: `srm:${s.id}`,
        severity: "danger",
        title: `${s.name} · SRM detected`,
        detail: "Group sizes diverge from configured weights — results untrustworthy.",
        when: "now",
        href: `./experiments?open=${s.id}`,
      });
    } else if (s.peekWarning) {
      alerts.push({
        id: `peek:${s.id}`,
        severity: "warn",
        title: `${s.name} · peek warning`,
        detail: "Stat method requires sequential testing; result not yet stable.",
        when: "now",
        href: `./experiments?open=${s.id}`,
      });
    }
  }

  return alerts;
}

async function fetchLastActorByRecord(projectId: string): Promise<Map<string, string>> {
  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const rows = await db
    .select({
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      actorEmail: auditLog.actorEmail,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(and(eq(auditLog.projectId, projectId), gte(auditLog.createdAt, since)))
    .orderBy(desc(auditLog.createdAt))
    .limit(500);
  const out = new Map<string, string>();
  for (const r of rows) {
    if (!r.resourceId) continue;
    const key = `${r.resourceType}:${r.resourceId}`;
    if (!out.has(key)) out.set(key, r.actorEmail);
  }
  return out;
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
