// POST /sdk/evaluate — client SDKs: load both blobs → eval locally → flat map.

import {
  evalExperiment,
  evalGatekeeper,
  getExperiments,
  getFlags,
  resolveEnv,
  type Experiment,
  type ExperimentAssignment,
  type Gatekeeper,
  type User,
} from "@shipeasy/core";
import type { AuthedContext } from "../lib/auth";

interface EvaluateRequest {
  user?: User;
  /**
   * Caller-supplied per-experiment group overrides (typically driven by URL
   * params handled by the SDK). When set, we skip allocation/holdout/group
   * hashing and force the named variant if it exists. Affects only this
   * request — no DB / KV mutation.
   */
  experiment_overrides?: Record<string, string>;
}

export async function handleEvaluate(c: AuthedContext) {
  const key = c.get("key");
  const body = (await c.req.json().catch(() => ({}))) as EvaluateRequest;
  const user: User = body.user ?? {};

  const targetEnv = resolveEnv(c.req.query("env"));
  const [flagsBlob, expsBlob] = await Promise.all([
    getFlags(c.env, key.project_id, targetEnv),
    getExperiments(c.env, key.project_id),
  ]);

  const flags: Record<string, boolean> = {};
  const gatesMap = flagsBlob.gates as Record<string, Gatekeeper>;
  for (const [name, gate] of Object.entries(gatesMap)) {
    flags[name] = evalGatekeeper(gate, user);
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
  const expOverrides = body.experiment_overrides ?? {};
  for (const [name, exp] of Object.entries(expsMap)) {
    if (exp.status !== "running") continue;

    // Forced variant from caller — short-circuits the eval pipeline.
    const forcedGroup = expOverrides[name];
    if (forcedGroup) {
      const group = exp.groups.find((g) => g.name === forcedGroup);
      if (group) {
        experiments[name] = { group: group.name, params: group.params, inExperiment: true };
        continue;
      }
    }

    const universe = universesMap[exp.universe];
    const holdout = universe?.holdout_range ?? null;
    const result = evalExperiment(exp, user, flags, holdout);
    if (result) experiments[name] = result;
  }

  const attrWarnings: Record<string, string[]> = {};
  for (const [name, gate] of Object.entries(gatesMap)) {
    // Collect referenced attributes across the whole stack (or the legacy
    // top-level rules if no stack is published).
    const referenced: string[] = [];
    if (gate.stack && gate.stack.length > 0) {
      for (const entry of gate.stack) {
        if (entry.type === "condition") {
          for (const r of entry.rules ?? []) referenced.push(r.attr);
        } else if (entry.type === "rollout" && entry.bucketBy) {
          referenced.push(entry.bucketBy);
        }
      }
    } else {
      for (const r of gate.rules ?? []) referenced.push(r.attr);
    }
    const missing = Array.from(new Set(referenced)).filter(
      (attr) => user[attr] === undefined || user[attr] === null,
    );
    if (missing.length > 0) attrWarnings[name] = missing;
  }

  return c.json({
    flags,
    configs,
    experiments,
    ...(Object.keys(attrWarnings).length > 0 ? { _attribute_warnings: attrWarnings } : {}),
  });
}
