// POST /sdk/evaluate — client SDKs: load both blobs → eval locally → flat map.

import {
  evalExperiment,
  evalGate,
  getExperiments,
  getFlags,
  type Experiment,
  type ExperimentAssignment,
  type Gate,
  type User,
} from "@shipeasy/core";
import type { AuthedContext } from "../lib/auth";

interface EvaluateRequest {
  user?: User;
}

export async function handleEvaluate(c: AuthedContext) {
  const key = c.get("key");
  const body = (await c.req.json().catch(() => ({}))) as EvaluateRequest;
  const user: User = body.user ?? {};

  const [flagsBlob, expsBlob] = await Promise.all([
    getFlags(c.env, key.project_id),
    getExperiments(c.env, key.project_id),
  ]);

  const flags: Record<string, boolean> = {};
  const gatesMap = flagsBlob.gates as Record<string, Gate>;
  for (const [name, gate] of Object.entries(gatesMap)) {
    flags[name] = evalGate(gate, user);
  }

  const configs: Record<string, unknown> = {};
  const configsMap = flagsBlob.configs as Record<string, { value: unknown }>;
  for (const [name, config] of Object.entries(configsMap)) {
    configs[name] = config.value;
  }

  const experiments: Record<string, ExperimentAssignment> = {};
  const expsMap = expsBlob.experiments as Record<string, Experiment>;
  const universesMap = expsBlob.universes as Record<
    string,
    { holdout_range?: [number, number] | null }
  >;
  for (const [name, exp] of Object.entries(expsMap)) {
    if (exp.status !== "running") continue;
    const universe = universesMap[exp.universe];
    const holdout = universe?.holdout_range ?? null;
    const result = evalExperiment(exp, user, flags, holdout);
    if (result) experiments[name] = result;
  }

  const attrWarnings: Record<string, string[]> = {};
  for (const [name, gate] of Object.entries(gatesMap)) {
    const missing = (gate.rules ?? [])
      .map((r) => r.attr)
      .filter((attr) => user[attr] === undefined || user[attr] === null);
    if (missing.length > 0) attrWarnings[name] = missing;
  }

  return c.json({
    flags,
    configs,
    experiments,
    ...(Object.keys(attrWarnings).length > 0 ? { _attribute_warnings: attrWarnings } : {}),
  });
}
