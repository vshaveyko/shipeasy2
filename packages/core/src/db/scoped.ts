// scopedDb(projectId) — project-scoped query builder.
// Consumers must go through this; raw db is kept internal.

import { and, eq, isNull, type SQL } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { getDb, type Db } from "./index";
import {
  gates,
  configs,
  configValues,
  configDrafts,
  universes,
  experiments,
  experimentMetrics,
  events,
  metrics,
  userAttributes,
  sdkKeys,
  auditLog,
  analysisFailures,
  experimentResults,
  userAliases,
  userMetricBaseline,
  projects,
  labelProfiles,
  labelChunks,
  labelKeys,
  labelDrafts,
  labelDraftKeys,
  i18nUsageDaily,
  projectMembers,
  bugReports,
  featureRequests,
  reportAttachments,
  connectors,
} from "./schema";

export type ScopedTable =
  | typeof gates
  | typeof configs
  | typeof configValues
  | typeof configDrafts
  | typeof universes
  | typeof experiments
  | typeof events
  | typeof metrics
  | typeof userAttributes
  | typeof sdkKeys
  | typeof auditLog
  | typeof analysisFailures
  | typeof experimentResults
  | typeof userAliases
  | typeof userMetricBaseline
  | typeof labelProfiles
  | typeof labelChunks
  | typeof labelKeys
  | typeof labelDrafts
  | typeof labelDraftKeys
  | typeof i18nUsageDaily
  | typeof projectMembers
  | typeof bugReports
  | typeof featureRequests
  | typeof reportAttachments
  | typeof connectors;

export type ScopedDb = ReturnType<typeof scopedDb>;

function notDeleted(table: SQLiteTable): SQL | undefined {
  const col = (table as unknown as Record<string, unknown>).deletedAt;
  if (col) return isNull(col as Parameters<typeof isNull>[0]);
  return undefined;
}

export function scopedDb(d1: D1Database, projectId: string) {
  const db = getDb(d1);
  const pid = (table: SQLiteTable) =>
    eq((table as unknown as { projectId: unknown }).projectId as SQL, projectId);

  return {
    raw: db,
    projectId,

    select<T extends ScopedTable>(table: T) {
      return db
        .select()
        .from(table)
        .where(and(pid(table), notDeleted(table))!);
    },

    selectWhere<T extends ScopedTable>(table: T, extra: SQL) {
      return db
        .select()
        .from(table)
        .where(and(pid(table), notDeleted(table), extra)!);
    },

    insert<T extends ScopedTable>(table: T) {
      return {
        values: (row: Record<string, unknown>) => {
          if (row.projectId !== undefined && row.projectId !== projectId) {
            throw new Error("Cross-project insert rejected");
          }
          return db.insert(table).values({ ...row, projectId } as never);
        },
      };
    },

    update<T extends ScopedTable>(table: T) {
      return {
        set: (values: Record<string, unknown>) => ({
          where: (condition: SQL) =>
            db
              .update(table)
              .set(values as never)
              .where(and(pid(table), condition)!),
        }),
      };
    },

    delete<T extends ScopedTable>(table: T) {
      return {
        where: (condition: SQL) => db.delete(table).where(and(pid(table), condition)!),
      };
    },
  };
}

// ── Named helpers for the 3 exempt tables that don't have project_id ─────────

export async function findProjectByEmail(d1: D1Database, email: string) {
  const db = getDb(d1);
  const rows = await db.select().from(projects).where(eq(projects.ownerEmail, email)).limit(1);
  return rows[0] ?? null;
}

export async function listProjectsByEmail(d1: D1Database, email: string) {
  const db = getDb(d1);
  return db
    .select()
    .from(projects)
    .where(eq(projects.ownerEmail, email))
    .orderBy(projects.createdAt)
    .all();
}

export async function findProjectById(d1: D1Database, id: string) {
  const db = getDb(d1);
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Returns projects the user can access — projects they own, plus projects
 * where they have a non-removed membership row (pending OR active). Pending
 * invitations are intentionally included: they get auto-accepted at the
 * first access check (`hasProjectAccess`), so anything in this list is
 * effectively reachable.
 */
export async function listAccessibleProjects(d1: D1Database, email: string) {
  const db = getDb(d1);
  // Membership rows are stored lowercased; SQLite text equality is
  // case-sensitive so we normalize here too rather than relying on every
  // caller to do it.
  const e = email.trim().toLowerCase();
  const owned = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerEmail, e))
    .orderBy(projects.createdAt)
    .all();
  const memberRows = await db
    .select({ project: projects })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(and(eq(projectMembers.email, e), isNull(projectMembers.removedAt))!)
    .all();
  const seen = new Set(owned.map((p) => p.id));
  const merged = [...owned];
  for (const row of memberRows) {
    if (seen.has(row.project.id)) continue;
    seen.add(row.project.id);
    merged.push(row.project);
  }
  merged.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  return merged;
}

/**
 * True if the user owns the project OR has an active (non-removed) membership.
 * Use anywhere you previously gated access on `project.ownerEmail === email`.
 */
export async function hasProjectAccess(
  d1: D1Database,
  projectId: string,
  email: string,
): Promise<boolean> {
  const db = getDb(d1);
  const e = email.trim().toLowerCase();
  const [owner] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerEmail, e))!)
    .limit(1);
  if (owner) return true;
  // Look up by (projectId, email) only — we then branch on status. This
  // lets us *lazily accept* a `pending` row on first successful access:
  // the JWT callback also tries to accept on sign-in, but a returning
  // user with a stale cookie may never re-trigger it. Doing the flip here
  // makes the access gate self-healing.
  const [member] = await db
    .select({ id: projectMembers.id, status: projectMembers.status })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.email, e),
        isNull(projectMembers.removedAt),
      )!,
    )
    .limit(1);
  if (!member) return false;
  if (member.status === "active") return true;
  if (member.status === "pending") {
    await db
      .update(projectMembers)
      .set({ status: "active", acceptedAt: new Date().toISOString() })
      .where(eq(projectMembers.id, member.id));
    return true;
  }
  // status === "removed" — the member was explicitly kicked, do not grant.
  return false;
}

/**
 * Marks all `pending` invitations addressed to this email as `active`. Called
 * on sign-in so users actually become members of the projects they were
 * invited to without needing a separate accept-invite UI.
 */
export async function acceptPendingInvitesForEmail(d1: D1Database, email: string): Promise<number> {
  const db = getDb(d1);
  const e = email.trim().toLowerCase();
  const now = new Date().toISOString();
  const pending = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(and(eq(projectMembers.email, e), eq(projectMembers.status, "pending"))!)
    .all();
  if (pending.length === 0) return 0;
  await db
    .update(projectMembers)
    .set({ status: "active", acceptedAt: now })
    .where(and(eq(projectMembers.email, e), eq(projectMembers.status, "pending"))!);
  return pending.length;
}

export async function findProjectByOwnerAndDomain(
  d1: D1Database,
  ownerEmail: string,
  domain: string,
) {
  const db = getDb(d1);
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.ownerEmail, ownerEmail), eq(projects.domain, domain))!)
    .limit(1);
  return rows[0] ?? null;
}

export async function insertProject(
  d1: D1Database,
  row: typeof projects.$inferInsert,
): Promise<void> {
  const db = getDb(d1);
  await db.insert(projects).values(row);
}

export async function updateProject(
  d1: D1Database,
  id: string,
  values: Partial<typeof projects.$inferInsert>,
): Promise<void> {
  const db = getDb(d1);
  await db.update(projects).set(values).where(eq(projects.id, id));
}

export async function upsertSystemHealth(
  d1: D1Database,
  key: string,
  data: { lastFiredAt: string; projectsEnqueued?: number | null },
): Promise<void> {
  const db = getDb(d1);
  const { systemHealth } = await import("./schema");
  await db
    .insert(systemHealth)
    .values({ key, lastFiredAt: data.lastFiredAt, projectsEnqueued: data.projectsEnqueued ?? null })
    .onConflictDoUpdate({
      target: systemHealth.key,
      set: { lastFiredAt: data.lastFiredAt, projectsEnqueued: data.projectsEnqueued ?? null },
    });
}

export async function findSdkKeyByHash(d1: D1Database, hash: string) {
  const db = getDb(d1);
  const rows = await db.select().from(sdkKeys).where(eq(sdkKeys.keyHash, hash)).limit(1);
  return rows[0] ?? null;
}
