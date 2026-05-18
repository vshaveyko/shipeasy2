import { listAllConfigs } from "@/lib/handlers/configs";
import { listAllExperiments } from "@/lib/handlers/experiments";
import { listAllGates } from "@/lib/handlers/gates";
import { listProfiles } from "@/lib/handlers/i18n";
import { getProject } from "@/lib/handlers/projects";
import { getEffectivePlan } from "@shipeasy/core";

export type HomeStateKind = "first-run" | "quiet" | "busy";

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

  const [gates, configs, experiments, profiles, project] = await Promise.all([
    listAllGates(identity).catch(() => [] as Awaited<ReturnType<typeof listAllGates>>),
    listAllConfigs(identity).catch(() => [] as Awaited<ReturnType<typeof listAllConfigs>>),
    listAllExperiments(identity).catch(() => [] as Awaited<ReturnType<typeof listAllExperiments>>),
    listProfiles(identity).catch(() => [] as Awaited<ReturnType<typeof listProfiles>>),
    getProject(identity, projectId).catch(() => null),
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
    projectName: project?.name ?? null,
    planName,
  };
}
