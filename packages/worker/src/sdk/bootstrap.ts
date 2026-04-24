// GET /sdk/bootstrap — SSR pre-evaluation for server components.
// Expects base64-encoded JSON user context in X-User-Context header.

import {
  evalExperiment,
  evalGate,
  getExperiments,
  getFlags,
  resolveEnv,
  type Experiment,
  type ExperimentAssignment,
  type Gate,
  type User,
} from "@shipeasy/core";
import type { AuthedContext } from "../lib/auth";

export async function handleBootstrap(c: AuthedContext) {
  const key = c.get("key");
  const header = c.req.header("X-User-Context");
  let user: User = {};
  if (header) {
    try {
      user = JSON.parse(atob(header)) as User;
    } catch {
      return c.text("X-User-Context must be base64-encoded JSON", 400);
    }
  }

  const targetEnv = resolveEnv(c.req.query("env"));
  const [flagsBlob, expsBlob] = await Promise.all([
    getFlags(c.env, key.project_id, targetEnv),
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
    const result = evalExperiment(exp, user, flags, universe?.holdout_range ?? null);
    if (result) experiments[name] = result;
  }

  const etag = `"${flagsBlob.version}-${expsBlob.version}"`;
  return new Response(JSON.stringify({ flags, configs, experiments }), {
    status: 200,
    headers: { "Content-Type": "application/json", ETag: etag },
  });
}
