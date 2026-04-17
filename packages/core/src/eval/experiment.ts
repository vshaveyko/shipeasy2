// evalExperiment — targeting → universe holdout → allocation → group assignment.
// See experiment-platform/04-evaluation.md.

import { getHashFn } from "./hash";
import type { User } from "./gate";

export interface ExperimentGroup {
  name: string;
  weight: number; // 0–10000 basis points; all groups sum to 10000
  params: Record<string, unknown>;
}

export interface Experiment {
  universe: string;
  targetingGate?: string | null;
  allocationPct: number; // 0–10000 basis points
  salt: string;
  groups: ExperimentGroup[];
  status: "draft" | "running" | "stopped" | "archived";
  hashVersion?: number;
}

export interface ExperimentAssignment {
  group: string;
  params: Record<string, unknown>;
}

export function evalExperiment(
  exp: Experiment,
  user: User,
  flags: Record<string, boolean>,
  universeHoldoutRange: [number, number] | null,
): ExperimentAssignment | null {
  if (exp.targetingGate && !flags[exp.targetingGate]) return null;

  const uid = user.user_id ?? user.anonymous_id;
  if (!uid) return null;

  const hash = getHashFn(exp.hashVersion);

  if (universeHoldoutRange) {
    const holdoutSeg = hash(`${exp.universe}:${uid}`) % 10000;
    const [lo, hi] = universeHoldoutRange;
    if (holdoutSeg >= lo && holdoutSeg <= hi) return null;
  }

  const allocHash = hash(`${exp.salt}:alloc:${uid}`) % 10000;
  if (allocHash >= exp.allocationPct) return null;

  const groupHash = hash(`${exp.salt}:group:${uid}`) % 10000;
  let cumulative = 0;
  for (let i = 0; i < exp.groups.length; i++) {
    const g = exp.groups[i];
    cumulative += g.weight;
    if (groupHash < cumulative || i === exp.groups.length - 1) {
      return { group: g.name, params: g.params };
    }
  }
  return null;
}
