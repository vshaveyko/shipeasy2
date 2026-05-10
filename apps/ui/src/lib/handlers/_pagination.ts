import { and, eq, lt, or, type Column, type SQL } from "drizzle-orm";
import {
  decodeCursor,
  encodeCursor,
  pageQuerySchema,
  type Page,
  type PageQuery,
} from "@shipeasy/core/pagination";

/** Extract `?limit=&cursor=` from a Request URL, applying defaults + bounds. */
export function parsePageQuery(req: Request): PageQuery {
  const url = new URL(req.url);
  return pageQuerySchema.parse({
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
}

/**
 * Drizzle WHERE fragment for `(ts, id) < (cursor.ts, cursor.id)`, i.e. keyset
 * pagination over `ORDER BY <ts> DESC, id DESC`. Pass the column the resource
 * sorts by (`updatedAt` for most, `createdAt` for universes/sdkKeys).
 * Returns undefined when no cursor was supplied (first page).
 *
 * Caller must apply this WHERE alongside any other constraints, then ORDER BY
 * the same `(<ts> desc, id desc)` and LIMIT to `pageQuery.limit + 1` before
 * passing rows to {@link sliceWithCursor}.
 */
export function keysetWhere(
  tsColumn: Column,
  idColumn: Column,
  cursor: string | undefined,
): SQL | undefined {
  if (!cursor) return undefined;
  const { ts, id } = decodeCursor(cursor);
  return or(lt(tsColumn, ts), and(eq(tsColumn, ts), lt(idColumn, id))!);
}

/**
 * Convert `limit + 1` rows into a `Page<T>` envelope. Strips the sentinel row
 * and emits a cursor when more pages remain. Pass the row's sort-timestamp
 * field name (defaults to `updatedAt` since most resources use it).
 */
export function sliceWithCursor<T extends { id: string }>(
  rows: T[],
  limit: number,
  tsField: keyof T = "updatedAt" as keyof T,
): Page<T> {
  if (rows.length > limit) {
    const data = rows.slice(0, limit);
    const last = data[data.length - 1]!;
    const ts = String(last[tsField]);
    return { data, next_cursor: encodeCursor({ ts, id: last.id }) };
  }
  return { data: rows, next_cursor: null };
}
