// POST /collect — event ingestion.
// exposure + metric → Analytics Engine (fire-and-forget); identify → D1 user_aliases.

import { getCatalog, getDb, getExperiments } from "@shipeasy/core";
import { events as eventsTable, userAliases, type EventProperty } from "@shipeasy/core/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { AuthedContext } from "../lib/auth";

type RawEvent =
  | {
      type: "exposure";
      experiment: string;
      group: string;
      user_id?: string;
      anonymous_id?: string;
      ts: number;
    }
  | {
      type: "metric";
      event_name: string;
      value?: number;
      user_id?: string;
      anonymous_id?: string;
      ts: number;
      properties?: Record<string, unknown>;
    }
  | {
      type: "identify";
      user_id: string;
      anonymous_id: string;
      ts: number;
    };

// AE METRIC_EVENTS wire layout:
//   blobs   = [event_name, user_id, anonymous_id, str_prop_0..str_prop_4]
//   doubles = [value, ts, num_prop_0..num_prop_4]
// Up to 5 string + 5 numeric event properties land in the trailing slots, in the order
// declared on the event row's `properties`. Booleans use a numeric slot (0/1).
// Same shape is read back by @shipeasy/query-dsl's compiler.
const AE_MAX_PROPS_PER_BUCKET = 5;
const AE_MAX_USER_PROPERTIES = 10;

export async function handleCollect(c: AuthedContext) {
  const key = c.get("key");

  // Use text() (not json()) — sendBeacon emits text/plain to skip CORS preflight.
  const raw = await c.req.text();
  let parsed: { events?: RawEvent[] };
  try {
    parsed = JSON.parse(raw) as { events?: RawEvent[] };
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const events = parsed.events ?? [];
  if (!Array.isArray(events) || events.length === 0) {
    return new Response(null, { status: 202 });
  }

  // Validate exposure experiment names against KV experiments blob.
  const experimentNames = new Set<string>();
  for (const e of events) if (e.type === "exposure") experimentNames.add(e.experiment);

  if (experimentNames.size > 0) {
    try {
      const expsBlob = await getExperiments(c.env, key.project_id);
      const valid = new Set(Object.keys(expsBlob.experiments));
      const invalid = [...experimentNames].filter((n) => !valid.has(n));
      if (invalid.length > 0) {
        return c.json({ error: "Unknown experiments", invalid }, 422);
      }
    } catch {
      // No experiments blob means nothing is running — any exposure is invalid.
      return c.json({ error: "No experiments configured", invalid: [...experimentNames] }, 422);
    }
  }

  // Validate metric event names against the catalog.
  // SDK auto-guardrail metrics (`__auto_*`) are built-in — bypass catalog check.
  const metricNames = new Set<string>();
  for (const e of events) {
    if (e.type !== "metric") continue;
    if (e.event_name.startsWith("__auto_")) continue;
    metricNames.add(e.event_name);
  }

  if (metricNames.size > 0) {
    const catalog = await getCatalog(c.env, key.project_id);
    const invalidEvents = [...metricNames].filter((n) => !catalog.has(n));
    if (invalidEvents.length > 0) {
      // Auto-discover: pending=1 rows for admin review; still 422.
      try {
        const db = getDb(c.env.DB);
        for (const name of invalidEvents) {
          await db
            .insert(eventsTable)
            .values({
              id: crypto.randomUUID(),
              projectId: key.project_id,
              name,
              description: null,
              properties: [],
              pending: 1,
              createdAt: new Date().toISOString(),
            })
            .onConflictDoNothing();
        }
      } catch (err) {
        console.warn(
          JSON.stringify({
            event: "catalog_autodiscover_failed",
            project_id: key.project_id,
            error: String(err),
          }),
        );
      }
      return c.json(
        {
          error: "Unregistered event names. Register them in the event catalog first.",
          unregistered: invalidEvents,
        },
        422,
      );
    }
  }

  // Validate metric payloads before writing to AE.
  for (const e of events) {
    if (e.type !== "metric") continue;
    if (e.value !== undefined && !Number.isFinite(Number(e.value))) {
      return c.json(
        {
          error: `Event '${e.event_name}': value must be a finite number, got ${JSON.stringify(e.value)}`,
        },
        422,
      );
    }
    const userProps = Object.keys(e.properties ?? {});
    if (userProps.length > AE_MAX_USER_PROPERTIES) {
      return c.json(
        {
          error:
            `Event '${e.event_name}': max ${AE_MAX_USER_PROPERTIES} properties allowed, got ${userProps.length}. ` +
            `AE schema is fixed — excess properties are silently dropped.`,
        },
        422,
      );
    }
  }

  // Write. AE is fire-and-forget. identify writes to D1.
  const db = getDb(c.env.DB);

  // Load event property layouts for metric events with payloads. Single batched read.
  // Events with no declared properties (or events emitted without a payload) keep the
  // legacy 3-blob / 2-double layout.
  const eventDefs = new Map<string, EventProperty[]>();
  const namesNeedingProps = new Set<string>();
  for (const e of events) {
    if (e.type === "metric" && e.properties && Object.keys(e.properties).length > 0) {
      namesNeedingProps.add(e.event_name);
    }
  }
  if (namesNeedingProps.size > 0) {
    const rows = await db
      .select({ name: eventsTable.name, properties: eventsTable.properties })
      .from(eventsTable)
      .where(
        and(
          eq(eventsTable.projectId, key.project_id),
          inArray(eventsTable.name, [...namesNeedingProps]),
        ),
      );
    for (const r of rows) eventDefs.set(r.name, r.properties ?? []);
  }
  for (const e of events) {
    if (e.type === "exposure") {
      // AE: one index only. Pack experiment + ids into blobs.
      c.env.EXPOSURES?.writeDataPoint({
        indexes: [key.project_id],
        blobs: [e.experiment, e.group, e.user_id ?? "", e.anonymous_id ?? ""],
        doubles: [e.ts],
      });
    } else if (e.type === "metric") {
      const def = eventDefs.get(e.event_name) ?? [];
      const propBlobs: string[] = [];
      const propDoubles: number[] = [];
      if (def.length > 0 && e.properties) {
        const strProps = def.filter((p) => p.type === "string").slice(0, AE_MAX_PROPS_PER_BUCKET);
        const numProps = def
          .filter((p) => p.type === "number" || p.type === "boolean")
          .slice(0, AE_MAX_PROPS_PER_BUCKET);
        for (const p of strProps) {
          const v = e.properties[p.name];
          propBlobs.push(v === undefined || v === null ? "" : String(v));
        }
        for (const p of numProps) {
          const v = e.properties[p.name];
          if (typeof v === "boolean") {
            propDoubles.push(v ? 1 : 0);
          } else {
            const n = Number(v);
            propDoubles.push(Number.isFinite(n) ? n : 0);
          }
        }
      }
      c.env.METRIC_EVENTS?.writeDataPoint({
        indexes: [key.project_id],
        blobs: [e.event_name, e.user_id ?? "", e.anonymous_id ?? "", ...propBlobs],
        doubles: [Number(e.value ?? 0), e.ts, ...propDoubles],
      });
    } else if (e.type === "identify" && e.user_id && e.anonymous_id) {
      await db
        .insert(userAliases)
        .values({
          projectId: key.project_id,
          anonymousId: e.anonymous_id,
          userId: e.user_id,
          createdAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [userAliases.projectId, userAliases.anonymousId],
          set: { userId: e.user_id },
        });
    }
  }

  return new Response(null, { status: 202 });
}
