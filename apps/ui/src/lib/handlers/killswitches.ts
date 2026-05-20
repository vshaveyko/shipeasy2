import { and, desc, eq, inArray } from "drizzle-orm";
import {
  ApiError,
  CONFIG_ENVS,
  KILLSWITCH_SCHEMA,
  checkLimit,
  getEffectivePlan,
  rebuildFlags,
  type ConfigEnv,
} from "@shipeasy/core";
import { configs, configValues, auditLog } from "@shipeasy/core/db/schema";
import {
  killswitchCreateSchema,
  killswitchUpdateSchema,
  killswitchSwitchSetSchema,
  killswitchSwitchUnsetSchema,
  type KillswitchValue,
} from "@shipeasy/core/schemas/killswitches";
import type { Page, PageQuery } from "@shipeasy/core/pagination";
import { scopedDb, scopedDbSA } from "../db";
import { getEnvAsync } from "../env";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import { syncUsage } from "../billing";
import type { AdminIdentity } from "../admin-auth";
import { keysetWhere, sliceWithCursor } from "./_pagination";

export type KillswitchSummary = {
  id: string;
  name: string;
  description: string | null;
  folder: string | null;
  updatedAt: string;
  envs: Partial<Record<ConfigEnv, KillswitchValue & { version: number; publishedAt: string }>>;
};

export type KillswitchActivity = {
  id: string;
  action: string;
  actorEmail: string;
  actorType: "user" | "cli" | "system";
  payload: unknown;
  createdAt: string;
};

function emptyValue(): KillswitchValue {
  return { value: false };
}

/** Coerce a stored configValues.valueJson into a KillswitchValue with safe defaults. */
function coerceValue(raw: unknown): KillswitchValue {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyValue();
  const r = raw as Record<string, unknown>;
  const value = typeof r.value === "boolean" ? r.value : false;
  const switches: Record<string, boolean> = {};
  if (r.switches && typeof r.switches === "object" && !Array.isArray(r.switches)) {
    for (const [k, v] of Object.entries(r.switches as Record<string, unknown>)) {
      if (typeof v === "boolean") switches[k] = v;
    }
  }
  const out: KillswitchValue = { value };
  if (Object.keys(switches).length > 0) out.switches = switches;
  return out;
}

function latestPerEnv<T extends { configId: string; env: string; version: number }>(
  rows: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const key = `${r.configId}:${r.env}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export async function listKillswitches(
  identity: AdminIdentity,
  opts: PageQuery,
): Promise<Page<KillswitchSummary>> {
  const s = scopedDb(identity.projectId);
  const ks = keysetWhere(configs.updatedAt, configs.id, opts.cursor);
  const where = ks ? and(eq(configs.kind, "killswitch"), ks)! : eq(configs.kind, "killswitch");
  const metaRows = await s
    .selectWhere(configs, where)
    .orderBy(desc(configs.updatedAt), desc(configs.id))
    .limit(opts.limit + 1);
  const sliced = sliceWithCursor(metaRows, opts.limit);
  const meta = sliced.data;
  if (meta.length === 0) return { data: [], next_cursor: sliced.next_cursor };

  const valueRows = await s
    .selectWhere(
      configValues,
      inArray(
        configValues.configId,
        meta.map((m) => m.id),
      ),
    )
    .orderBy(desc(configValues.version));
  const latest = latestPerEnv(valueRows);
  const byConfig = new Map<string, KillswitchSummary["envs"]>();
  for (const v of latest) {
    let map = byConfig.get(v.configId);
    if (!map) {
      map = {};
      byConfig.set(v.configId, map);
    }
    const coerced = coerceValue(v.valueJson);
    map[v.env as ConfigEnv] = {
      ...coerced,
      version: v.version,
      publishedAt: v.publishedAt,
    };
  }
  const data = meta.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    folder: m.folder ?? null,
    updatedAt: m.updatedAt,
    envs: byConfig.get(m.id) ?? {},
  }));
  return { data, next_cursor: sliced.next_cursor };
}

export async function listAllKillswitches(identity: AdminIdentity): Promise<KillswitchSummary[]> {
  const out: KillswitchSummary[] = [];
  let cursor: string | undefined;
  do {
    const page = await listKillswitches(identity, { limit: 500, cursor });
    out.push(...page.data);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return out;
}

export interface KillswitchCounts {
  total: number;
  on: number;
  off: number;
}

/**
 * Aggregate counts for the killswitches list view. "ON" / "OFF" follows the
 * UI's `prod ?? staging ?? dev` precedence — whichever env is the
 * authoritative live value for this killswitch. Computed server-side so the
 * dashboard never iterates rows to produce the stat trio + tab labels.
 */
export async function killswitchCounts(identity: AdminIdentity): Promise<KillswitchCounts> {
  const rows = await listAllKillswitches(identity);
  let on = 0;
  for (const r of rows) {
    const active = r.envs.prod ?? r.envs.staging ?? r.envs.dev;
    if (active?.value) on++;
  }
  return { total: rows.length, on, off: rows.length - on };
}

export async function getKillswitch(
  identity: AdminIdentity,
  id: string,
): Promise<KillswitchSummary> {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(
    configs,
    and(eq(configs.id, id), eq(configs.kind, "killswitch"))!,
  );
  if (rows.length === 0) throw new ApiError("Killswitch not found", 404);
  const meta = rows[0];
  const valueRows = await s
    .selectWhere(configValues, eq(configValues.configId, id))
    .orderBy(desc(configValues.version));
  const latest = latestPerEnv(valueRows);
  const envs: KillswitchSummary["envs"] = {};
  for (const v of latest) {
    envs[v.env as ConfigEnv] = {
      ...coerceValue(v.valueJson),
      version: v.version,
      publishedAt: v.publishedAt,
    };
  }
  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    folder: meta.folder ?? null,
    updatedAt: meta.updatedAt,
    envs,
  };
}

async function publishToAllEnvs(
  identity: AdminIdentity,
  configId: string,
  value: KillswitchValue,
  now: string,
) {
  const s = await scopedDbSA(identity.projectId);
  for (const envName of CONFIG_ENVS) {
    const latest = await s
      .selectWhere(
        configValues,
        and(eq(configValues.configId, configId), eq(configValues.env, envName))!,
      )
      .orderBy(desc(configValues.version))
      .limit(1);
    const nextVersion = (latest[0]?.version ?? 0) + 1;
    await s.insert(configValues).values({
      id: crypto.randomUUID(),
      configId,
      env: envName,
      valueJson: value,
      version: nextVersion,
      publishedAt: now,
      publishedBy: identity.actorEmail,
    });
  }
}

export async function createKillswitch(identity: AdminIdentity, input: unknown) {
  const parsed = killswitchCreateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getEffectivePlan(project);
  const env = await getEnvAsync();

  await checkLimit(env.DB, identity.projectId, "configs", plan);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const value: KillswitchValue = { value: parsed.value ?? false };
  if (parsed.switches && Object.keys(parsed.switches).length > 0) {
    value.switches = parsed.switches;
  }

  const s = await scopedDbSA(identity.projectId);
  try {
    await s.insert(configs).values({
      id,
      name: parsed.name,
      description: parsed.description ?? null,
      folder: parsed.folder ?? null,
      kind: "killswitch",
      schemaJson: KILLSWITCH_SCHEMA,
      updatedAt: now,
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      throw new ApiError(`Killswitch '${parsed.name}' already exists`, 409);
    }
    throw err;
  }

  for (const envName of CONFIG_ENVS) {
    await s.insert(configValues).values({
      id: crypto.randomUUID(),
      configId: id,
      env: envName,
      valueJson: value,
      version: 1,
      publishedAt: now,
      publishedBy: identity.actorEmail,
    });
  }

  await rebuildFlags(env, identity.projectId, project.plan);
  await syncUsage(env, identity.projectId);
  await writeAudit(identity, "killswitch.create", "killswitch", id, parsed);
  return { id, name: parsed.name };
}

export async function updateKillswitch(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = killswitchUpdateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const now = new Date().toISOString();
  const s = await scopedDbSA(identity.projectId);

  const rows = await s.selectWhere(
    configs,
    and(eq(configs.id, id), eq(configs.kind, "killswitch"))!,
  );
  if (rows.length === 0) throw new ApiError("Killswitch not found", 404);

  // Description/folder-only update doesn't change values.
  if (parsed.value === undefined && parsed.switches === undefined) {
    const metaPatch: Record<string, unknown> = { updatedAt: now };
    if (parsed.description !== undefined) metaPatch.description = parsed.description ?? null;
    if (parsed.folder !== undefined) metaPatch.folder = parsed.folder;
    if (Object.keys(metaPatch).length > 1) {
      await s.update(configs).set(metaPatch).where(eq(configs.id, id));
    }
    await writeAudit(identity, "killswitch.update", "killswitch", id, parsed);
    return { id };
  }

  // Compose the new value from the latest dev row + the patch (we publish the
  // composed value to all envs since the modal edits are flat across envs).
  const latestDev = await s
    .selectWhere(configValues, and(eq(configValues.configId, id), eq(configValues.env, "dev"))!)
    .orderBy(desc(configValues.version))
    .limit(1);
  const current = coerceValue(latestDev[0]?.valueJson);
  const next: KillswitchValue = {
    value: parsed.value !== undefined ? parsed.value : current.value,
  };
  const switches = parsed.switches !== undefined ? parsed.switches : current.switches;
  if (switches && Object.keys(switches).length > 0) next.switches = switches;

  await publishToAllEnvs(identity, id, next, now);

  const patch: Record<string, unknown> = { updatedAt: now };
  if (parsed.description !== undefined) patch.description = parsed.description ?? null;
  if (parsed.folder !== undefined) patch.folder = parsed.folder;
  await s.update(configs).set(patch).where(eq(configs.id, id));

  await rebuildFlags(env, identity.projectId, project.plan);
  await writeAudit(identity, "killswitch.update", "killswitch", id, parsed);
  return { id };
}

export async function deleteKillswitch(identity: AdminIdentity, id: string) {
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(
    configs,
    and(eq(configs.id, id), eq(configs.kind, "killswitch"))!,
  );
  if (rows.length === 0) throw new ApiError("Killswitch not found", 404);
  await s.update(configs).set({ deletedAt: new Date().toISOString() }).where(eq(configs.id, id));
  await rebuildFlags(env, identity.projectId, project.plan);
  await syncUsage(env, identity.projectId);
  await writeAudit(identity, "killswitch.delete", "killswitch", id);
  return { ok: true };
}

/** Set or update one switch entry on one env. */
export async function setKillswitchSwitch(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = killswitchSwitchSetSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const now = new Date().toISOString();
  const s = await scopedDbSA(identity.projectId);

  const rows = await s.selectWhere(
    configs,
    and(eq(configs.id, id), eq(configs.kind, "killswitch"))!,
  );
  if (rows.length === 0) throw new ApiError("Killswitch not found", 404);

  const latest = await s
    .selectWhere(
      configValues,
      and(eq(configValues.configId, id), eq(configValues.env, parsed.env))!,
    )
    .orderBy(desc(configValues.version))
    .limit(1);
  const current = coerceValue(latest[0]?.valueJson);
  const switches = { ...(current.switches ?? {}) };
  switches[parsed.switchKey] = parsed.value;
  const next: KillswitchValue = { value: current.value, switches };

  const nextVersion = (latest[0]?.version ?? 0) + 1;
  await s.insert(configValues).values({
    id: crypto.randomUUID(),
    configId: id,
    env: parsed.env,
    valueJson: next,
    version: nextVersion,
    publishedAt: now,
    publishedBy: identity.actorEmail,
  });
  await s.update(configs).set({ updatedAt: now }).where(eq(configs.id, id));
  await rebuildFlags(env, identity.projectId, project.plan);
  await writeAudit(identity, "killswitch.switch.set", "killswitch", id, parsed);
  return { id, env: parsed.env, switchKey: parsed.switchKey, value: parsed.value };
}

export async function unsetKillswitchSwitch(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = killswitchSwitchUnsetSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const env = await getEnvAsync();
  const now = new Date().toISOString();
  const s = await scopedDbSA(identity.projectId);

  const rows = await s.selectWhere(
    configs,
    and(eq(configs.id, id), eq(configs.kind, "killswitch"))!,
  );
  if (rows.length === 0) throw new ApiError("Killswitch not found", 404);

  const latest = await s
    .selectWhere(
      configValues,
      and(eq(configValues.configId, id), eq(configValues.env, parsed.env))!,
    )
    .orderBy(desc(configValues.version))
    .limit(1);
  const current = coerceValue(latest[0]?.valueJson);
  if (!current.switches || !(parsed.switchKey in current.switches)) {
    return { id, env: parsed.env, switchKey: parsed.switchKey, removed: false };
  }
  const switches = { ...current.switches };
  delete switches[parsed.switchKey];
  const next: KillswitchValue = { value: current.value };
  if (Object.keys(switches).length > 0) next.switches = switches;

  const nextVersion = (latest[0]?.version ?? 0) + 1;
  await s.insert(configValues).values({
    id: crypto.randomUUID(),
    configId: id,
    env: parsed.env,
    valueJson: next,
    version: nextVersion,
    publishedAt: now,
    publishedBy: identity.actorEmail,
  });
  await s.update(configs).set({ updatedAt: now }).where(eq(configs.id, id));
  await rebuildFlags(env, identity.projectId, project.plan);
  await writeAudit(identity, "killswitch.switch.unset", "killswitch", id, parsed);
  return { id, env: parsed.env, switchKey: parsed.switchKey, removed: true };
}

export async function listKillswitchActivity(
  identity: AdminIdentity,
  id: string,
  limit = 20,
): Promise<KillswitchActivity[]> {
  const s = scopedDb(identity.projectId);
  const rows = await s
    .selectWhere(
      auditLog,
      and(eq(auditLog.resourceType, "killswitch"), eq(auditLog.resourceId, id))!,
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    actorEmail: r.actorEmail,
    actorType: r.actorType,
    payload: r.payload ? safeParse(r.payload) : null,
    createdAt: r.createdAt,
  }));
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
