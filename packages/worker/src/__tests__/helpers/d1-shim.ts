// Thin D1Database shim backed by better-sqlite3 (in-memory).
// Covers exactly the surface Drizzle D1 driver uses: prepare / bind / run /
// all / first / raw.  Not a full D1 spec — just enough for our tests.

import Database from "better-sqlite3";

export const SCHEMA_SQL = /* sql */ `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rules TEXT NOT NULL DEFAULT '[]',
  rollout_pct INTEGER NOT NULL DEFAULT 0,
  salt TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  killswitch INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS configs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS universes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'user_id',
  holdout_range TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  universe TEXT NOT NULL,
  targeting_gate TEXT,
  allocation_pct INTEGER NOT NULL DEFAULT 0,
  salt TEXT NOT NULL,
  params TEXT NOT NULL DEFAULT '{}',
  groups TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  started_at TEXT,
  stopped_at TEXT,
  significance_threshold REAL NOT NULL DEFAULT 0.05,
  min_runtime_days INTEGER NOT NULL DEFAULT 0,
  min_sample_size INTEGER NOT NULL DEFAULT 100,
  cuped_frozen_at TEXT,
  sequential_testing INTEGER NOT NULL DEFAULT 0,
  hash_version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  properties TEXT NOT NULL DEFAULT '[]',
  pending INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_aliases (
  project_id TEXT NOT NULL,
  anonymous_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, anonymous_id)
);

CREATE TABLE IF NOT EXISTS sdk_keys (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'experiments',
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  expires_at TEXT
);
`;

function makeStmt(sqlite: Database.Database, sql: string) {
  let boundArgs: unknown[] = [];

  const stmt = {
    bind(...args: unknown[]) {
      boundArgs = args;
      return stmt;
    },

    async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
      const row = sqlite.prepare(sql).get(...boundArgs) as T | null;
      if (!row) return null;
      if (colName) return (row as Record<string, T>)[colName] as T;
      return row;
    },

    async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
      const results = sqlite.prepare(sql).all(...boundArgs) as T[];
      return {
        results,
        success: true,
        meta: {
          duration: 0,
          last_row_id: 0,
          changes: 0,
          served_by: "test",
          internal_stats: null,
          size_after: 0,
          rows_read: 0,
          rows_written: 0,
          changed_db: false,
        },
      };
    },

    async run(): Promise<D1Result> {
      const info = sqlite.prepare(sql).run(...boundArgs);
      return {
        results: [],
        success: true,
        meta: {
          duration: 0,
          last_row_id: Number(info.lastInsertRowid),
          changes: info.changes,
          served_by: "test",
          internal_stats: null,
          size_after: 0,
          rows_read: 0,
          rows_written: 0,
          changed_db: false,
        },
      };
    },

    async raw<T = unknown[]>(opts?: { columnNames?: boolean }): Promise<T | [string[], ...T[]]> {
      if (opts?.columnNames) {
        const prepared = sqlite.prepare(sql);
        const columnNames = prepared.columns().map((c) => c.name);
        const rows = prepared.raw().all(...boundArgs) as T[];
        return [columnNames, ...rows] as unknown as [string[], ...T[]];
      }
      return sqlite
        .prepare(sql)
        .raw()
        .all(...boundArgs) as T;
    },
  };

  return stmt as unknown as D1PreparedStatement;
}

export function makeD1(sqlite: Database.Database): D1Database {
  return {
    prepare(sql: string) {
      return makeStmt(sqlite, sql);
    },

    async exec(query: string) {
      sqlite.exec(query);
      return { results: [], success: true, count: 0, duration: 0 } as unknown as D1ExecResult;
    },

    async batch<T = Record<string, unknown>>(
      statements: D1PreparedStatement[],
    ): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      const tx = sqlite.transaction(() => {
        for (const s of statements) {
          // Run each statement synchronously inside transaction
          // The stmt object stores its own sql + args — run() returns a promise,
          // so we call the internal sync path directly.
          const anyS = s as unknown as { run: () => Promise<D1Result<T>> };
          // We can't await inside a transaction, so call the underlying sqlite
          // This is a simplified batch: fine for tests where we don't use drizzle.batch()
          results.push(anyS.run() as unknown as D1Result<T>);
        }
      });
      tx();
      return results;
    },

    async dump(): Promise<ArrayBuffer> {
      return new ArrayBuffer(0);
    },
  } as unknown as D1Database;
}

export function makeInMemoryD1(): { sqlite: Database.Database; d1: D1Database } {
  const sqlite = new Database(":memory:");
  sqlite.exec(SCHEMA_SQL);
  const d1 = makeD1(sqlite);
  return { sqlite, d1 };
}
