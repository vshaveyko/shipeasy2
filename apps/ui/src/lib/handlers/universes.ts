import { and, desc, eq, ne } from "drizzle-orm";
import { checkLimit, rebuildExperiments, ApiError, getEffectivePlan } from "@shipeasy/core";
import { universes, experiments } from "@shipeasy/core/db/schema";
import { universeCreateSchema, universeUpdateSchema } from "@shipeasy/core/schemas/universes";
import type { Page, PageQuery } from "@shipeasy/core/pagination";
import { scopedDb, scopedDbSA } from "../db";
import { getEnvAsync } from "../env";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";
import { keysetWhere, sliceWithCursor } from "./_pagination";

type UniverseRow = Awaited<ReturnType<ReturnType<typeof scopedDb>["select"]>>[number];

/**
 * Universes table has no `updated_at` column, so we paginate by `created_at`.
 * This is acceptable: universes change rarely after creation.
 */
export async function listUniverses(
  identity: AdminIdentity,
  opts: PageQuery,
): Promise<Page<UniverseRow>> {
  const s = scopedDb(identity.projectId);
  const ks = keysetWhere(universes.createdAt, universes.id, opts.cursor);
  const base = ks ? s.selectWhere(universes, ks) : s.select(universes);
  const rows = await base
    .orderBy(desc(universes.createdAt), desc(universes.id))
    .limit(opts.limit + 1);
  return sliceWithCursor(rows as UniverseRow[], opts.limit, "createdAt");
}

export async function listAllUniverses(identity: AdminIdentity): Promise<UniverseRow[]> {
  const out: UniverseRow[] = [];
  let cursor: string | undefined;
  do {
    const page = await listUniverses(identity, { limit: 500, cursor });
    out.push(...page.data);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return out;
}

export async function createUniverse(identity: AdminIdentity, input: unknown) {
  const parsed = universeCreateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getEffectivePlan(project);
  const env = await getEnvAsync();

  if (parsed.holdout_range && !plan.holdout_groups) {
    throw new ApiError("holdout_groups requires Pro plan or higher", 403);
  }

  await checkLimit(env.DB, identity.projectId, "universes", plan);

  const id = crypto.randomUUID();
  const s = await scopedDbSA(identity.projectId);
  try {
    await s.insert(universes).values({
      id,
      name: parsed.name,
      folder: parsed.folder ?? null,
      unitType: parsed.unit_type,
      holdoutRange: parsed.holdout_range,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) throw new ApiError(`Universe '${parsed.name}' exists`, 409);
    throw err;
  }

  await rebuildExperiments(env, identity.projectId);
  await writeAudit(identity, "universe.create", "universe", id, parsed);
  return { id, name: parsed.name };
}

export async function updateUniverse(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = universeUpdateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getEffectivePlan(project);
  const env = await getEnvAsync();

  if (parsed.holdout_range !== undefined && parsed.holdout_range !== null && !plan.holdout_groups) {
    throw new ApiError("holdout_groups requires Pro plan or higher", 403);
  }

  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(universes, eq(universes.id, id));
  if (rows.length === 0) throw new ApiError("Universe not found", 404);

  const patch: Record<string, unknown> = {};
  if (parsed.holdout_range !== undefined) patch.holdoutRange = parsed.holdout_range;
  if (parsed.folder !== undefined) patch.folder = parsed.folder;

  await s.update(universes).set(patch).where(eq(universes.id, id));
  await rebuildExperiments(env, identity.projectId);
  await writeAudit(identity, "universe.update", "universe", id, parsed);
  return { id };
}

export async function deleteUniverse(identity: AdminIdentity, id: string) {
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(universes, eq(universes.id, id));
  if (rows.length === 0) throw new ApiError("Universe not found", 404);

  const universe = rows[0];
  const activeExps = await s.selectWhere(
    experiments,
    and(eq(experiments.universe, universe.name), ne(experiments.status, "archived"))!,
  );
  if (activeExps.length > 0) {
    throw new ApiError(
      `Universe is used by ${activeExps.length} active experiment(s). Archive them first.`,
      409,
    );
  }

  await s
    .update(universes)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(universes.id, id));
  await rebuildExperiments(env, identity.projectId);
  await writeAudit(identity, "universe.delete", "universe", id);
  return { ok: true };
}
