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
  | typeof reportAttachments;

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
