import type { APIRequestContext } from "@playwright/test";

/**
 * Drain a paginated admin list endpoint into a flat array. The admin API
 * returns `{ data, next_cursor }` for `/api/admin/{gates,configs,experiments,
 * universes,killswitches,keys}`. Older endpoints still return raw arrays;
 * this helper normalises both. Use it in e2e specs instead of calling
 * `page.request.get(path)` + `await resp.json()` directly.
 */
export async function adminList<T = unknown>(
  request: APIRequestContext,
  path: string,
): Promise<T[]> {
  const sep = path.includes("?") ? "&" : "?";
  const out: T[] = [];
  let cursor: string | null = null;
  do {
    const q = `${sep}limit=500${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const resp = await request.get(`${path}${q}`);
    if (!resp.ok()) {
      throw new Error(`${path} → HTTP ${resp.status()} ${await resp.text().catch(() => "")}`);
    }
    const body = (await resp.json()) as T[] | { data: T[]; next_cursor: string | null };
    if (Array.isArray(body)) return body;
    out.push(...body.data);
    cursor = body.next_cursor;
  } while (cursor);
  return out;
}
