// Cloudflare Analytics Engine SQL query helper. Cursor-paginated, with a 429 backoff.

import type { WorkerEnv } from "../env";

export interface AEQueryRow {
  [column: string]: string | number | null;
}

export async function queryAE<T extends AEQueryRow = AEQueryRow>(
  sql: string,
  env: WorkerEnv,
): Promise<T[]> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    throw new Error("queryAE: CF_ACCOUNT_ID and CF_API_TOKEN must be configured");
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`;
  const rows: T[] = [];
  let cursor: string | undefined;

  // Safety cap: max 100 pages (~500K rows).
  for (let page = 0; page < 100; page++) {
    const body: Record<string, unknown> = { query: sql };
    if (cursor) body.cursor = cursor;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 5_000));
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AE SQL error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as {
      data?: T[];
      meta?: { pagination?: { cursor?: string } };
    };
    if (data.data?.length) rows.push(...data.data);
    cursor = data.meta?.pagination?.cursor;
    if (!cursor) break;
  }

  return rows;
}

// Escape a single-quoted SQL string literal. AE SQL is safe here only because
// callers build predicates from project-id/experiment-name values that passed
// validation upstream; still, belt-and-suspenders for any user-supplied value.
export function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
