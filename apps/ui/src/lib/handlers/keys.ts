import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import {
  checkLimit,
  ApiError,
  getEffectivePlan,
  sha256,
  writeSdkKeyEntry,
  deleteSdkKeyEntry,
} from "@shipeasy/core";
import { sdkKeys } from "@shipeasy/core/db/schema";
import { keyCreateSchema } from "@shipeasy/core/schemas/keys";
import type { Page, PageQuery } from "@shipeasy/core/pagination";
import { scopedDb, scopedDbSA } from "../db";
import { getEnvAsync } from "../env";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";
import { keysetWhere, sliceWithCursor } from "./_pagination";

export interface KeySummary {
  id: string;
  type: string;
  created_at: string;
  revoked_at: string | null;
  expires_at: string | null;
  created_by_email: string | null;
}

function toSummary(r: typeof sdkKeys.$inferSelect): KeySummary {
  return {
    id: r.id,
    type: r.type,
    created_at: r.createdAt,
    revoked_at: r.revokedAt,
    expires_at: r.expiresAt,
    created_by_email: r.createdByEmail,
  };
}

/**
 * sdkKeys has no `updated_at` column; we paginate by `created_at`. The public
 * shape uses snake_case (`created_at`), so we encode the cursor on raw rows
 * (which use `createdAt`) and only transform the page slice.
 */
export async function listKeys(
  identity: AdminIdentity,
  opts: PageQuery,
): Promise<Page<KeySummary>> {
  const s = scopedDb(identity.projectId);
  const ks = keysetWhere(sdkKeys.createdAt, sdkKeys.id, opts.cursor);
  const base = ks ? s.selectWhere(sdkKeys, ks) : s.select(sdkKeys);
  const rows = await base.orderBy(desc(sdkKeys.createdAt), desc(sdkKeys.id)).limit(opts.limit + 1);
  const sliced = sliceWithCursor(rows, opts.limit, "createdAt");
  return { data: sliced.data.map(toSummary), next_cursor: sliced.next_cursor };
}

export async function listAllKeys(identity: AdminIdentity): Promise<KeySummary[]> {
  const out: KeySummary[] = [];
  let cursor: string | undefined;
  do {
    const page = await listKeys(identity, { limit: 500, cursor });
    out.push(...page.data);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return out;
}

export async function listActiveKeys(identity: AdminIdentity) {
  const s = scopedDb(identity.projectId);
  const rows = await s.selectWhere(sdkKeys, isNull(sdkKeys.revokedAt));
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    created_at: r.createdAt,
    revoked_at: r.revokedAt,
    expires_at: r.expiresAt,
    created_by_email: r.createdByEmail,
  }));
}

export async function listRevokedKeys(
  identity: AdminIdentity,
  opts: { offset?: number; limit?: number } = {},
) {
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 10));
  const s = scopedDb(identity.projectId);
  // Drizzle scoped helper doesn't expose orderBy/limit, so dip into raw db
  // for the paginated read. Same project-scope filter applied manually.
  const rows = await s.raw
    .select()
    .from(sdkKeys)
    .where(and(eq(sdkKeys.projectId, identity.projectId), isNotNull(sdkKeys.revokedAt))!)
    .orderBy(desc(sdkKeys.revokedAt))
    .limit(limit + 1)
    .offset(offset);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  return {
    rows: page.map((r) => ({
      id: r.id,
      type: r.type,
      created_at: r.createdAt,
      revoked_at: r.revokedAt,
      expires_at: r.expiresAt,
      created_by_email: r.createdByEmail,
    })),
    hasMore,
    nextOffset: offset + page.length,
  };
}

export async function createKey(identity: AdminIdentity, input: unknown) {
  const parsed = keyCreateSchema.parse(input);
  const project = await loadProject(identity.projectId);
  const plan = getEffectivePlan(project);
  const env = await getEnvAsync();

  // Admin keys (CLI / devtools auth tokens) are not user-facing SDK keys and
  // don't count toward the plan limit — only "server" and "client" keys do.
  if (parsed.type !== "admin") {
    await checkLimit(env.DB, identity.projectId, "sdk_keys", plan);
  }

  const raw = `sdk_${parsed.type}_${crypto.randomUUID().replace(/-/g, "")}`;
  const hash = await sha256(raw);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt =
    parsed.type === "admin" ? new Date(Date.now() + 90 * 86_400_000).toISOString() : null;

  // Track creator from any auth source so we can enforce one-active-key-per-user
  // on subsequent creates. "cli"/"unknown" are placeholder actor strings used
  // when an older SDK key has no createdByEmail — treat those as no-owner.
  const creatorEmail =
    identity.actorEmail && identity.actorEmail !== "cli" && identity.actorEmail !== "unknown"
      ? identity.actorEmail
      : null;
  const s = await scopedDbSA(identity.projectId);

  // Auto-revoke prior active keys for the same (project, user, type) before
  // minting the new one — at most one active key per human per type per
  // project. Skip when we don't know the owner: revoking unowned keys would
  // sweep service keys minted by other actors.
  if (creatorEmail) {
    const prior = await s.selectWhere(
      sdkKeys,
      and(
        eq(sdkKeys.type, parsed.type),
        eq(sdkKeys.createdByEmail, creatorEmail),
        isNull(sdkKeys.revokedAt),
      )!,
    );
    if (prior.length > 0) {
      await s
        .update(sdkKeys)
        .set({ revokedAt: now })
        .where(
          and(
            eq(sdkKeys.type, parsed.type),
            eq(sdkKeys.createdByEmail, creatorEmail),
            isNull(sdkKeys.revokedAt),
          )!,
        );
      for (const k of prior) {
        await deleteSdkKeyEntry(env, k.keyHash);
        await writeAudit(identity, "key.revoke", "sdk_key", k.id, { reason: "superseded" });
      }
    }
  }

  await s.insert(sdkKeys).values({
    id,
    keyHash: hash,
    type: parsed.type,
    createdAt: now,
    expiresAt,
    createdByEmail: creatorEmail,
  });

  await writeSdkKeyEntry(env, hash, {
    project_id: identity.projectId,
    type: parsed.type,
    expires_at: expiresAt,
    allowed_origin: project.domain ?? null,
    created_by_email: creatorEmail,
  });
  await writeAudit(identity, "key.create", "sdk_key", id, { type: parsed.type });
  return { id, type: parsed.type, key: raw, expires_at: expiresAt };
}

export async function revokeKey(identity: AdminIdentity, id: string) {
  const env = await getEnvAsync();
  const s = await scopedDbSA(identity.projectId);
  const rows = await s.selectWhere(sdkKeys, eq(sdkKeys.id, id));
  if (rows.length === 0) throw new ApiError("Key not found", 404);
  const key = rows[0];
  if (key.revokedAt) return { id, revoked: true };

  await s.update(sdkKeys).set({ revokedAt: new Date().toISOString() }).where(eq(sdkKeys.id, id));

  await deleteSdkKeyEntry(env, key.keyHash);
  await writeAudit(identity, "key.revoke", "sdk_key", id);
  return { id, revoked: true };
}
