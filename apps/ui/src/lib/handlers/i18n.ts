import { and, count, eq, inArray, isNull, like, or, sum } from "drizzle-orm";
import { ApiError, getDb } from "@shipeasy/core";
import {
  labelProfiles,
  labelChunks,
  labelKeys,
  labelDrafts,
  labelDraftKeys,
  i18nUsageDaily,
} from "@shipeasy/core/db/schema";
import {
  profileCreateSchema,
  keysPushSchema,
  keyUpdateSchema,
  draftCreateSchema,
  draftUpdateSchema,
} from "@shipeasy/core/schemas/i18n";
import { scopedDb, scopedDbSA } from "../db";
import { getEnv, getEnvAsync } from "../env";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

// ── Profiles ─────────────────────────────────────────────────────────────────

export async function listProfiles(identity: AdminIdentity) {
  const s = scopedDb(identity.projectId);
  return s.select(labelProfiles);
}

export async function createProfile(identity: AdminIdentity, input: unknown) {
  const parsed = profileCreateSchema.parse(input);
  const s = await scopedDbSA(identity.projectId);
  const id = crypto.randomUUID();
  try {
    await s.insert(labelProfiles).values({
      id,
      name: parsed.name,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      throw new ApiError(`Profile '${parsed.name}' already exists`, 409);
    }
    throw err;
  }
  await writeAudit(identity, "i18n.profile.create", "label_profile", id, parsed);
  return { id, name: parsed.name };
}

export async function deleteProfile(identity: AdminIdentity, id: string) {
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(labelProfiles, eq(labelProfiles.id, id));
  if (existing.length === 0) throw new ApiError("Profile not found", 404);
  await s
    .update(labelProfiles)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(labelProfiles.id, id));
  await writeAudit(identity, "i18n.profile.delete", "label_profile", id);
  return { ok: true };
}

// ── Keys ──────────────────────────────────────────────────────────────────────

export type KeyRow = {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
  updatedBy: string;
  profileId: string;
  profileName: string | null;
  chunkId: string;
  chunkName: string | null;
};

export async function listKeys(
  identity: AdminIdentity,
  profileId?: string,
  prefix?: string,
  search?: string,
): Promise<KeyRow[]> {
  const env = getEnv();
  const db = getDb(env.DB);

  const q = db
    .select({
      id: labelKeys.id,
      key: labelKeys.key,
      value: labelKeys.value,
      description: labelKeys.description,
      updatedAt: labelKeys.updatedAt,
      updatedBy: labelKeys.updatedBy,
      profileId: labelKeys.profileId,
      profileName: labelProfiles.name,
      chunkId: labelKeys.chunkId,
      chunkName: labelChunks.name,
    })
    .from(labelKeys)
    .innerJoin(
      labelProfiles,
      and(eq(labelKeys.profileId, labelProfiles.id), isNull(labelProfiles.deletedAt))!,
    )
    .leftJoin(labelChunks, eq(labelKeys.chunkId, labelChunks.id));

  const projectFilter = eq(labelKeys.projectId, identity.projectId);
  const profileFilter = profileId ? eq(labelKeys.profileId, profileId) : undefined;
  const prefixFilter = prefix
    ? or(eq(labelKeys.key, prefix), like(labelKeys.key, `${prefix}.%`))
    : undefined;
  const searchFilter = search
    ? or(like(labelKeys.key, `%${search}%`), like(labelKeys.value, `%${search}%`))
    : undefined;

  const rows = await q.where(and(projectFilter, profileFilter, prefixFilter, searchFilter));
  return rows as KeyRow[];
}

export type KeySection = {
  prefix: string;
  count: number;
  /** Only set when count === 1 — lets the UI render the leaf without a second fetch. */
  soleId: string | null;
  soleKey: string | null;
  soleValue: string | null;
  soleDescription: string | null;
  soleProfileId: string | null;
  soleChunkId: string | null;
  soleUpdatedAt: string | null;
  soleUpdatedBy: string | null;
};

/** Top-level sections for a profile (first dot-segment of each key → count). */
export async function listKeySections(
  identity: AdminIdentity,
  profileId: string,
): Promise<KeySection[]> {
  const env = getEnv();
  // Raw D1 query — Drizzle has no expression-level CASE in GROUP BY yet.
  // When a section has exactly one key we piggy-back its full data so the UI
  // can render a leaf row without a second network round-trip.
  const result = await env.DB.prepare(
    `SELECT
       CASE WHEN instr(key, '.') > 0
            THEN substr(key, 1, instr(key, '.') - 1)
            ELSE key
       END AS prefix,
       count(*) AS cnt,
       CASE WHEN count(*) = 1 THEN id          ELSE NULL END AS sole_id,
       CASE WHEN count(*) = 1 THEN key         ELSE NULL END AS sole_key,
       CASE WHEN count(*) = 1 THEN value       ELSE NULL END AS sole_value,
       CASE WHEN count(*) = 1 THEN description ELSE NULL END AS sole_description,
       CASE WHEN count(*) = 1 THEN profile_id  ELSE NULL END AS sole_profile_id,
       CASE WHEN count(*) = 1 THEN chunk_id    ELSE NULL END AS sole_chunk_id,
       CASE WHEN count(*) = 1 THEN updated_at  ELSE NULL END AS sole_updated_at,
       CASE WHEN count(*) = 1 THEN updated_by  ELSE NULL END AS sole_updated_by
     FROM label_keys
     WHERE project_id = ?1 AND profile_id = ?2
     GROUP BY prefix
     ORDER BY prefix`,
  )
    .bind(identity.projectId, profileId)
    .all<{
      prefix: string;
      cnt: number;
      sole_id: string | null;
      sole_key: string | null;
      sole_value: string | null;
      sole_description: string | null;
      sole_profile_id: string | null;
      sole_chunk_id: string | null;
      sole_updated_at: string | null;
      sole_updated_by: string | null;
    }>();
  return (result.results ?? []).map((r) => ({
    prefix: r.prefix,
    count: r.cnt,
    soleId: r.sole_id,
    soleKey: r.sole_key,
    soleValue: r.sole_value,
    soleDescription: r.sole_description,
    soleProfileId: r.sole_profile_id,
    soleChunkId: r.sole_chunk_id,
    soleUpdatedAt: r.sole_updated_at,
    soleUpdatedBy: r.sole_updated_by,
  }));
}

export async function upsertKeys(identity: AdminIdentity, input: unknown) {
  const parsed = keysPushSchema.parse(input);
  const s = await scopedDbSA(identity.projectId);

  const profile = await s.selectWhere(labelProfiles, eq(labelProfiles.id, parsed.profile_id));
  if (profile.length === 0) throw new ApiError("Profile not found", 404);

  let chunk = (
    await s.selectWhere(
      labelChunks,
      and(eq(labelChunks.profileId, parsed.profile_id), eq(labelChunks.name, parsed.chunk))!,
    )
  )[0];

  if (!chunk) {
    const chunkId = crypto.randomUUID();
    await s.insert(labelChunks).values({
      id: chunkId,
      profileId: parsed.profile_id,
      name: parsed.chunk,
      isIndex: parsed.chunk === "default" ? 1 : 0,
    });
    const created = await s.selectWhere(labelChunks, eq(labelChunks.id, chunkId));
    chunk = created[0];
  }

  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const now = new Date().toISOString();
  let upserted = 0;

  for (const item of parsed.keys) {
    await db
      .insert(labelKeys)
      .values({
        id: crypto.randomUUID(),
        projectId: identity.projectId,
        profileId: parsed.profile_id,
        chunkId: chunk.id,
        key: item.key,
        value: item.value,
        description: item.description ?? null,
        updatedAt: now,
        updatedBy: identity.actorEmail,
      })
      .onConflictDoUpdate({
        target: [labelKeys.profileId, labelKeys.key],
        set: {
          value: item.value,
          description: item.description ?? null,
          updatedAt: now,
          updatedBy: identity.actorEmail,
        },
      });
    upserted++;
  }

  await writeAudit(identity, "i18n.keys.push", "label_keys", parsed.profile_id, {
    chunk: parsed.chunk,
    count: upserted,
  });
  return { upserted, chunk: chunk.name };
}

export async function updateKey(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = keyUpdateSchema.parse(input);
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(labelKeys, eq(labelKeys.id, id));
  if (existing.length === 0) throw new ApiError("Key not found", 404);

  await s
    .update(labelKeys)
    .set({
      value: parsed.value,
      description: parsed.description ?? null,
      updatedAt: new Date().toISOString(),
      updatedBy: identity.actorEmail,
    })
    .where(eq(labelKeys.id, id));

  await writeAudit(identity, "i18n.key.update", "label_key", id, parsed);
  return { id };
}

export async function deleteKey(identity: AdminIdentity, id: string) {
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(labelKeys, eq(labelKeys.id, id));
  if (existing.length === 0) throw new ApiError("Key not found", 404);
  await s.delete(labelKeys).where(eq(labelKeys.id, id));
  await writeAudit(identity, "i18n.key.delete", "label_key", id);
  return { ok: true };
}

export async function bulkDeleteKeys(identity: AdminIdentity, ids: string[]) {
  if (ids.length === 0) return { deleted: 0 };
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(labelKeys, inArray(labelKeys.id, ids));
  if (existing.length === 0) throw new ApiError("No matching keys found", 404);
  await s.delete(labelKeys).where(inArray(labelKeys.id, ids));
  await writeAudit(identity, "i18n.key.bulk_delete", "label_key", null, {
    count: existing.length,
    ids: existing.map((k) => k.id),
  });
  return { deleted: existing.length };
}

// ── Drafts ────────────────────────────────────────────────────────────────────

export async function listDrafts(identity: AdminIdentity, profileId?: string) {
  const s = scopedDb(identity.projectId);
  const result = profileId
    ? await s.selectWhere(labelDrafts, eq(labelDrafts.profileId, profileId))
    : await s.select(labelDrafts);
  return result;
}

export async function createDraft(identity: AdminIdentity, input: unknown) {
  const parsed = draftCreateSchema.parse(input);
  const s = await scopedDbSA(identity.projectId);

  const profile = await s.selectWhere(labelProfiles, eq(labelProfiles.id, parsed.profile_id));
  if (profile.length === 0) throw new ApiError("Profile not found", 404);

  const id = crypto.randomUUID();
  try {
    await s.insert(labelDrafts).values({
      id,
      profileId: parsed.profile_id,
      name: parsed.name,
      sourceProfileId: parsed.source_profile_id ?? null,
      createdBy: identity.actorEmail,
      status: "open",
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      throw new ApiError(`Draft '${parsed.name}' already exists`, 409);
    }
    throw err;
  }

  await writeAudit(identity, "i18n.draft.create", "label_draft", id, parsed);
  return { id, name: parsed.name };
}

export async function updateDraft(identity: AdminIdentity, id: string, input: unknown) {
  const parsed = draftUpdateSchema.parse(input);
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(labelDrafts, eq(labelDrafts.id, id));
  if (existing.length === 0) throw new ApiError("Draft not found", 404);

  const patch: Record<string, unknown> = {};
  if (parsed.status !== undefined) {
    patch.status = parsed.status;
    if (parsed.status === "merged") patch.publishedAt = new Date().toISOString();
  }

  await s.update(labelDrafts).set(patch).where(eq(labelDrafts.id, id));
  await writeAudit(identity, "i18n.draft.update", "label_draft", id, parsed);
  return { id };
}

export async function deleteDraft(identity: AdminIdentity, id: string) {
  const s = await scopedDbSA(identity.projectId);
  const existing = await s.selectWhere(labelDrafts, eq(labelDrafts.id, id));
  if (existing.length === 0) throw new ApiError("Draft not found", 404);
  await s.delete(labelDrafts).where(eq(labelDrafts.id, id));
  await writeAudit(identity, "i18n.draft.delete", "label_draft", id);
  return { ok: true };
}

// ── Draft keys ───────────────────────────────────────────────────────────────

export type DraftKeyRow = {
  id: string;
  draftId: string;
  key: string;
  value: string;
  description: string | null;
  updatedBy: string;
  updatedAt: string;
};

export async function listDraftKeys(
  identity: AdminIdentity,
  draftId: string,
): Promise<DraftKeyRow[]> {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(labelDraftKeys, eq(labelDraftKeys.draftId, draftId));
  return rows as DraftKeyRow[];
}

export async function upsertDraftKey(
  identity: AdminIdentity,
  draftId: string,
  key: string,
  value: string,
  description?: string | null,
) {
  const s = await scopedDbSA(identity.projectId);
  const draft = await s.selectWhere(labelDrafts, eq(labelDrafts.id, draftId));
  if (draft.length === 0) throw new ApiError("Draft not found", 404);
  if (draft[0].status !== "open") throw new ApiError("Draft is not open", 400);

  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const now = new Date().toISOString();

  await db
    .insert(labelDraftKeys)
    .values({
      id: crypto.randomUUID(),
      projectId: identity.projectId,
      draftId,
      key,
      value,
      description: description ?? null,
      updatedBy: identity.actorEmail,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [labelDraftKeys.draftId, labelDraftKeys.key],
      set: {
        value,
        description: description ?? null,
        updatedBy: identity.actorEmail,
        updatedAt: now,
      },
    });

  await writeAudit(identity, "i18n.draft.key.upsert", "label_draft_key", draftId, { key, value });
}

// ── Publish ───────────────────────────────────────────────────────────────────

export async function publishProfile(
  identity: AdminIdentity,
  id: string,
  body: { chunk?: string },
) {
  const s = await scopedDbSA(identity.projectId);
  const profiles = await s.selectWhere(labelProfiles, eq(labelProfiles.id, id));
  if (profiles.length === 0) throw new ApiError("Profile not found", 404);

  const chunkName = body.chunk ?? "default";
  const chunks = await s.selectWhere(
    labelChunks,
    and(eq(labelChunks.profileId, id), eq(labelChunks.name, chunkName))!,
  );
  if (chunks.length === 0) throw new ApiError(`Chunk '${chunkName}' not found`, 404);

  const chunk = chunks[0];
  const now = new Date().toISOString();

  await s.update(labelChunks).set({ publishedAt: now }).where(eq(labelChunks.id, chunk.id));

  await writeAudit(identity, "i18n.profile.publish", "label_profile", id, { chunk: chunkName });
  return { ok: true, profile_id: id, chunk: chunkName, published_at: now };
}

// ── Overview stats ────────────────────────────────────────────────────────────

export async function getI18nStats(identity: AdminIdentity) {
  const env = getEnv();
  const db = getDb(env.DB);

  const [profileCount, keyCount, draftCount, usageCount] = await Promise.all([
    db
      .select({ n: count() })
      .from(labelProfiles)
      .where(and(eq(labelProfiles.projectId, identity.projectId), isNull(labelProfiles.deletedAt))!)
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: count() })
      .from(labelKeys)
      .where(eq(labelKeys.projectId, identity.projectId))
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: count() })
      .from(labelDrafts)
      .where(and(eq(labelDrafts.projectId, identity.projectId), eq(labelDrafts.status, "open"))!)
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sum(i18nUsageDaily.requestCount) })
      .from(i18nUsageDaily)
      .where(
        and(
          eq(i18nUsageDaily.projectId, identity.projectId),
          eq(i18nUsageDaily.date, new Date().toISOString().slice(0, 10)),
        )!,
      )
      .then((r) => Number(r[0]?.n ?? 0)),
  ]);

  return {
    profiles: profileCount,
    keys: keyCount,
    openDrafts: draftCount,
    loaderReqDaily: usageCount,
  };
}
