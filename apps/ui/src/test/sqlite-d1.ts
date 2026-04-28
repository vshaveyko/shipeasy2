import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS = [
  join(__dirname, "../../../../packages/worker/migrations/0000_groovy_sunspot.sql"),
  join(__dirname, "../../../../packages/worker/migrations/0001_far_wendigo.sql"),
  join(__dirname, "../../../../packages/worker/migrations/0002_soft_delete.sql"),
  join(__dirname, "../../../../packages/worker/migrations/0003_label_keys_variables.sql"),
  join(__dirname, "../../../../packages/worker/migrations/0004_configs_env_versioning.sql"),
  join(__dirname, "../../../../packages/worker/migrations/0005_project_members.sql"),
  join(__dirname, "../../../../packages/worker/migrations/0006_feedback.sql"),
  join(__dirname, "../../../../packages/worker/migrations/0007_grey_santa_claus.sql"),
  join(__dirname, "../../../../packages/worker/migrations/0008_billing.sql"),
  join(__dirname, "../../../../packages/worker/migrations/0009_mixed_zzzax.sql"),
  join(__dirname, "../../../../packages/worker/migrations/0010_add_project_domain.sql"),
  join(__dirname, "../../../../packages/worker/migrations/0011_multi_project.sql"),
];

class SqliteStatement {
  private _params: unknown[] = [];

  constructor(
    private readonly db: Database.Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): this {
    const next = new SqliteStatement(this.db, this.sql) as this;
    next._params = values;
    return next;
  }

  async first<T = unknown>(): Promise<T | null> {
    return (this.db.prepare(this.sql).get(...this._params) as T) ?? null;
  }

  async run(): Promise<D1Result> {
    const info = this.db.prepare(this.sql).run(...this._params);
    return {
      results: [],
      success: true,
      meta: {
        last_row_id: Number(info.lastInsertRowid),
        changes: info.changes,
        rows_written: info.changes,
        rows_read: 0,
        duration: 0,
        size_after: 0,
        changed_db: info.changes > 0,
      },
    };
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    const results = this.db.prepare(this.sql).all(...this._params) as T[];
    return {
      results,
      success: true,
      meta: {
        rows_read: results.length,
        duration: 0,
        rows_written: 0,
        last_row_id: 0,
        changes: 0,
        changed_db: false,
        size_after: 0,
      },
    };
  }

  async raw<T = unknown>(): Promise<T[][]> {
    return this.db
      .prepare(this.sql)
      .raw()
      .all(...this._params) as T[][];
  }
}

export class SqliteD1 {
  constructor(private readonly db: Database.Database) {}

  prepare(query: string): D1PreparedStatement {
    return new SqliteStatement(this.db, query) as unknown as D1PreparedStatement;
  }

  async dump(): Promise<ArrayBuffer> {
    throw new Error("dump() not supported in SqliteD1 stub");
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    return Promise.all(statements.map((s) => (s as unknown as SqliteStatement).all<T>()));
  }

  async exec(query: string): Promise<D1ExecResult> {
    const parts = query.split("--> statement-breakpoint");
    for (const part of parts) {
      const t = part.trim();
      if (t) this.db.exec(t);
    }
    return { count: parts.length, duration: 0 };
  }
}

export function createTestDb(): SqliteD1 {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  for (const migration of MIGRATIONS) {
    const sql = readFileSync(migration, "utf8");
    for (const stmt of sql.split("--> statement-breakpoint")) {
      const t = stmt.trim();
      if (t) db.exec(t);
    }
  }
  return new SqliteD1(db);
}
