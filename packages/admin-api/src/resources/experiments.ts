import { z } from "zod";
import {
  experimentCreateSchema,
  experimentUpdateSchema,
  experimentStatusUpdateSchema,
  experimentMetricsUpdateSchema,
} from "@shipeasy/core/schemas/experiments";
import type { Transport } from "../transport.js";
import { ApiError } from "../transport.js";

/**
 * Input shape callers send (defaults still optional). The server applies
 * defaults via `.parse()`, so consumers can omit `significance_threshold`,
 * `min_runtime_days`, `params`, etc. — `z.input` expresses that.
 */
export type ExperimentCreateInput = z.input<typeof experimentCreateSchema>;
export type ExperimentUpdateInput = z.input<typeof experimentUpdateSchema>;

export interface Experiment {
  id: string;
  name: string;
  status: "draft" | "running" | "stopped" | "archived" | string;
  universe: string;
  allocationPct: number;
  significance_threshold?: number;
  min_runtime_days?: number;
  startedAt?: string | null;
  started_at?: string | null;
  updatedAt?: string;
}

export interface ExperimentResult {
  metric: string;
  group_name: string;
  ds: string;
  n: number | null;
  mean: number | null;
  delta_pct: number | null;
  p_value: number | null;
  srm_detected: number | null;
}

export interface ExperimentTimeseriesPoint {
  ds: string;
  group_name: string;
  metric: string;
  value: number | null;
}

export type ExperimentStatus = "draft" | "running" | "stopped" | "archived";

export interface ExperimentMetricsInput {
  metrics: { metric_id: string; role: "goal" | "guardrail" | "secondary" }[];
}

export interface ExperimentsClient {
  list(): Promise<Experiment[]>;
  get(id: string): Promise<Experiment>;
  resolve(idOrName: string): Promise<Experiment>;
  create(input: ExperimentCreateInput): Promise<Experiment>;
  update(id: string, input: ExperimentUpdateInput): Promise<Experiment>;
  delete(id: string): Promise<{ ok: true }>;
  setStatus(id: string, status: ExperimentStatus): Promise<Experiment>;
  start(id: string): Promise<Experiment>;
  stop(id: string): Promise<Experiment>;
  archive(id: string): Promise<Experiment>;
  setMetrics(id: string, input: ExperimentMetricsInput): Promise<unknown>;
  results(id: string): Promise<ExperimentResult[]>;
  timeseries(id: string, metric?: string): Promise<ExperimentTimeseriesPoint[]>;
  reanalyze(id: string): Promise<{ ok: true }>;
}

const BASE = "/api/admin/experiments";

export function experimentsClient(t: Transport): ExperimentsClient {
  async function list() {
    return t.request<Experiment[]>("GET", BASE);
  }
  async function resolve(idOrName: string) {
    // Server has GET /:id but we accept name too. Try id first via list (single
    // round trip) since the list is small in practice.
    const all = await list();
    const found = all.find((e) => e.id === idOrName) ?? all.find((e) => e.name === idOrName);
    if (!found) throw new ApiError(`Experiment '${idOrName}' not found`, 404);
    return found;
  }
  async function setStatus(id: string, status: ExperimentStatus) {
    return t.request<Experiment>(
      "POST",
      `${BASE}/${id}/status`,
      experimentStatusUpdateSchema.parse({ status }),
    );
  }

  return {
    list,
    resolve,
    get: (id: string) => t.request<Experiment>("GET", `${BASE}/${id}`),
    create: (input) => t.request<Experiment>("POST", BASE, experimentCreateSchema.parse(input)),
    update: (id, input) =>
      t.request<Experiment>("PATCH", `${BASE}/${id}`, experimentUpdateSchema.parse(input)),
    delete: (id) => t.request<{ ok: true }>("DELETE", `${BASE}/${id}`),
    setStatus,
    start: (id) => setStatus(id, "running"),
    stop: (id) => setStatus(id, "stopped"),
    archive: (id) => setStatus(id, "archived"),
    setMetrics: (id, input) =>
      t.request("POST", `${BASE}/${id}/metrics`, experimentMetricsUpdateSchema.parse(input)),
    results: (id) => t.request<ExperimentResult[]>("GET", `${BASE}/${id}/results`),
    timeseries: (id, metric) =>
      t.request<ExperimentTimeseriesPoint[]>(
        "GET",
        `${BASE}/${id}/timeseries`,
        undefined,
        metric ? { metric } : undefined,
      ),
    reanalyze: (id) => t.request<{ ok: true }>("POST", `${BASE}/${id}/reanalyze`),
  };
}

export const experimentsResource = {
  name: "experiments" as const,
  basePath: BASE,
  describeOne: "experiment",
  describeMany: "experiments",
  schemas: {
    create: experimentCreateSchema,
    update: experimentUpdateSchema,
  },
  actions: [
    { name: "start", description: "Transition draft experiment to running" },
    { name: "stop", description: "Stop a running experiment" },
    { name: "archive", description: "Archive a stopped experiment" },
    { name: "reanalyze", description: "Re-run analysis pass for the experiment" },
  ] as const,
} as const;
