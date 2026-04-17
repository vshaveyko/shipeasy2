// POST /collect — event ingestion.
// exposure + metric → Analytics Engine (fire-and-forget); identify → D1 user_aliases.

import { getCatalog, getDb, getExperiments } from "@shipeasy/core";
import { events as eventsTable, userAliases } from "@shipeasy/core/db/schema";
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

const AE_MAX_USER_PROPERTIES = 3;

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
  const metricNames = new Set<string>();
  for (const e of events) if (e.type === "metric") metricNames.add(e.event_name);

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
  for (const e of events) {
    if (e.type === "exposure") {
      c.env.EXPOSURES?.writeDataPoint({
        blobs: [e.group, e.user_id ?? "", e.anonymous_id ?? ""],
        doubles: [e.ts],
        indexes: [key.project_id, e.experiment, "exposure"],
      });
    } else if (e.type === "metric") {
      c.env.METRIC_EVENTS?.writeDataPoint({
        blobs: [e.user_id ?? "", e.anonymous_id ?? ""],
        doubles: [Number(e.value ?? 0), e.ts],
        indexes: [key.project_id, e.event_name, "metric"],
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
