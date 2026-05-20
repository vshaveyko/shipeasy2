import { and, eq, inArray } from "drizzle-orm";
import { checkLimit, ApiError, getEffectivePlan, getDb } from "@shipeasy/core";
import { metrics, events, experimentMetrics, experiments } from "@shipeasy/core/db/schema";
import {
  metricCreateSchema,
  metricUpdateSchema,
  legacyAggFromIr,
  legacyValuePathFromIr,
  type MetricQueryIRInput,
} from "@shipeasy/core/schemas/metrics";
import {
  parse as parseDsl,
  render as renderDsl,
  ParseError as DslParseError,
  type Query as DslQuery,
} from "@shipeasy/query-dsl";

function resolveIr(input: {
  query_ir?: MetricQueryIRInput;
  query?: string;
}): MetricQueryIRInput | undefined {
  if (input.query_ir) return input.query_ir;
  if (!input.query) return undefined;
  try {
    const ir = parseDsl(input.query);
    return ir as MetricQueryIRInput;
  } catch (e) {
    if (e instanceof DslParseError) throw new ApiError(`Invalid query: ${e.message}`, 422);
    throw e;
  }
}
import { scopedDb, scopedDbSA } from "../db";
import { getEnv, getEnvAsync } from "../env";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

async function assertEventExists(projectId: string, name: string) {
  const s = await scopedDbSA(projectId);
  const rows = await s.selectWhere(events, eq(events.name, name));
  if (rows.length === 0) throw new ApiError(`Event '${name}' not registered`, 422);
  if (rows[0].pending === 1) throw new ApiError(`Event '${name}' is pending review`, 422);
  return rows[0];
}

function assertIrConsistent(eventName: string, ir: MetricQueryIRInput) {
  if (ir.metric !== eventName) {
    throw new ApiError(
      `query_ir.metric ('${ir.metric}') must equal event_name ('${eventName}')`,
      422,
    );
  }
}

function assertIrLabelsKnown(ir: MetricQueryIRInput, eventProps: { name: string; type: string }[]) {
  const known = new Set<string>(["user_id", "anonymous_id", ...eventProps.map((p) => p.name)]);
  for (const f of ir.filters) {
    if (!known.has(f.label)) {
      throw new ApiError(
        `Filter label '${f.label}' is not a declared property of '${ir.metric}'`,
        422,
      );
    }
  }
  if (ir.groupBy) {
    for (const l of ir.groupBy.labels) {
      if (!known.has(l)) {
        throw new ApiError(
          `groupBy label '${l}' is not a declared property of '${ir.metric}'`,
          422,
        );
      }
    }
  }
  if (ir.valueLabel && eventProps.length > 0) {
    // Only enforce when the event declared a properties schema. Events with no schema
    // accept any label as a free-form numeric path (legacy SDK behavior).
    const p = eventProps.find((p) => p.name === ir.valueLabel);
    if (!p || p.type !== "number") {
      throw new ApiError(
        `Value label '${ir.valueLabel}' must be a numeric property of '${ir.metric}'`,
        422,
      );
    }
  }
}

function withRenderedQuery<T extends { queryIr: unknown }>(row: T): T & { query: string | null } {
  let query: string | null = null;
  if (row.queryIr) {
    try {
      query = renderDsl(row.queryIr as DslQuery);
    } catch {
      query = null;
    }
  }
  return { ...row, query };
}

export async function listMetrics(identity: AdminIdentity) {
  const rows = await scopedDb(identity.projectId).select(metrics);
  return rows.map(withRenderedQuery);
}

export async function getMetric(identity: AdminIdentity, id: string) {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(metrics, eq(metrics.id, id));
  if (rows.length === 0) throw new ApiError("Metric not found", 404);
  return withRenderedQuery(rows[0]);
}

export async function createMetric(identity: AdminIdentity, input: unknown) {
  const parsed = metricCreateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getEffectivePlan(project);
  const env = await getEnvAsync();

  const eventRow = await assertEventExists(identity.projectId, parsed.event_name);
  const ir = resolveIr(parsed);
  if (!ir) throw new ApiError("Missing query_ir or query", 422);
  assertIrConsistent(parsed.event_name, ir);
  assertIrLabelsKnown(ir, eventRow.properties ?? []);
  await checkLimit(env.DB, identity.projectId, "metrics", plan);

  const id = crypto.randomUUID();
  const s = await scopedDbSA(identity.projectId);
  try {
    await s.insert(metrics).values({
      id,
      name: parsed.name,
      folder: parsed.folder ?? null,
      eventName: parsed.event_name,
      valuePath: legacyValuePathFromIr(ir),
      aggregation: legacyAggFromIr(ir),
      queryIr: ir,
      winsorizePct: parsed.winsorize_pct,
      minDetectableEffect: parsed.min_detectable_effect,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) throw new ApiError(`Metric '${parsed.name}' exists`, 409);
    throw err;
  }
  await writeAudit(identity, "metric.create", "metric", id, parsed);
  return { id, name: parsed.name };
}

export async function updateMetric(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = metricUpdateSchema.parse(input);
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(metrics, eq(metrics.id, id));
  if (rows.length === 0) throw new ApiError("Metric not found", 404);

  const targetEventName = parsed.event_name ?? rows[0].eventName;
  const eventRow = await assertEventExists(identity.projectId, targetEventName);
  const updateIr = resolveIr(parsed);
  if (updateIr) {
    assertIrConsistent(targetEventName, updateIr);
    assertIrLabelsKnown(updateIr, eventRow.properties ?? []);
  }

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.folder !== undefined) patch.folder = parsed.folder;
  if (parsed.event_name !== undefined) patch.eventName = parsed.event_name;
  if (updateIr !== undefined) {
    patch.queryIr = updateIr;
    patch.aggregation = legacyAggFromIr(updateIr);
    patch.valuePath = legacyValuePathFromIr(updateIr);
  }
  if (parsed.winsorize_pct !== undefined) patch.winsorizePct = parsed.winsorize_pct;
  if (parsed.min_detectable_effect !== undefined)
    patch.minDetectableEffect = parsed.min_detectable_effect;

  await s.update(metrics).set(patch).where(eq(metrics.id, id));
  await writeAudit(identity, "metric.update", "metric", id, parsed);
  return { id };
}

export async function deleteMetric(identity: AdminIdentity, id: string) {
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(metrics, eq(metrics.id, id));
  if (rows.length === 0) throw new ApiError("Metric not found", 404);

  const db = getDb(env.DB);
  const runningExps = await db
    .select({ id: experiments.id, name: experiments.name })
    .from(experimentMetrics)
    .innerJoin(experiments, eq(experimentMetrics.experimentId, experiments.id))
    .where(and(eq(experimentMetrics.metricId, id), eq(experiments.status, "running")));
  if (runningExps.length > 0) {
    throw new ApiError(
      `Metric is attached to ${runningExps.length} running experiment(s). Stop them first.`,
      409,
    );
  }

  await s.update(metrics).set({ deletedAt: new Date().toISOString() }).where(eq(metrics.id, id));
  await writeAudit(identity, "metric.delete", "metric", id);
  return { ok: true };
}

export async function bulkDeleteMetrics(identity: AdminIdentity, ids: string[]) {
  if (ids.length === 0) return { deleted: 0 };
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(metrics, inArray(metrics.id, ids));
  if (existing.length === 0) throw new ApiError("No matching metrics found", 404);
  await s
    .update(metrics)
    .set({ deletedAt: new Date().toISOString() })
    .where(inArray(metrics.id, ids));
  await writeAudit(identity, "metric.bulk_delete", "metric", null, {
    count: existing.length,
    ids: existing.map((m) => m.id),
  });
  return { deleted: existing.length };
}
