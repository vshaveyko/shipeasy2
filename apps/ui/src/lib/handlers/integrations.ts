import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, getDb } from "@shipeasy/core";
import {
  integrationSettings,
  type IntegrationKind,
} from "@shipeasy/core/db/schema";
import { getEnvAsync } from "../env";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

export interface IntegrationCatalogEntry {
  kind: IntegrationKind;
  name: string;
  desc: string;
  icon: string;
}

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    kind: "slack",
    name: "Slack",
    desc: "Post experiment updates to a Slack channel.",
    icon: "#",
  },
  {
    kind: "github",
    name: "GitHub",
    desc: "Open PRs from Claude when experiments graduate.",
    icon: "gh",
  },
  {
    kind: "datadog",
    name: "Datadog",
    desc: "Send experiment-tagged metrics into Datadog dashboards.",
    icon: "dd",
  },
  {
    kind: "segment",
    name: "Segment",
    desc: "Forward exposure events to your existing pipeline.",
    icon: "sg",
  },
  {
    kind: "linear",
    name: "Linear",
    desc: "Auto-create tickets when an experiment is killed.",
    icon: "li",
  },
  {
    kind: "pagerduty",
    name: "PagerDuty",
    desc: "Alert on-call when a killswitch flips in production.",
    icon: "pd",
  },
];

export type IntegrationRow = IntegrationCatalogEntry & {
  status: "available" | "connected";
  config: Record<string, unknown> | null;
  connectedAt: string | null;
};

export async function listIntegrations(identity: AdminIdentity): Promise<IntegrationRow[]> {
  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const rows = await db
    .select()
    .from(integrationSettings)
    .where(eq(integrationSettings.projectId, identity.projectId));
  const byKind = new Map(rows.map((r) => [r.kind as IntegrationKind, r] as const));
  return INTEGRATION_CATALOG.map((entry) => {
    const row = byKind.get(entry.kind);
    return {
      ...entry,
      status: (row?.status as "available" | "connected") ?? "available",
      config: row?.config ?? null,
      connectedAt: row?.connectedAt ?? null,
    };
  });
}

const KIND_SCHEMA = z.enum(["slack", "github", "datadog", "segment", "linear", "pagerduty"]);

const connectSchema = z.object({
  kind: KIND_SCHEMA,
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function connectIntegration(identity: AdminIdentity, input: unknown) {
  const parsed = connectSchema.parse(input);
  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const now = new Date().toISOString();

  await db
    .insert(integrationSettings)
    .values({
      projectId: identity.projectId,
      kind: parsed.kind,
      status: "connected",
      config: parsed.config ?? {},
      connectedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [integrationSettings.projectId, integrationSettings.kind],
      set: {
        status: "connected",
        config: parsed.config ?? {},
        connectedAt: now,
        updatedAt: now,
      },
    });

  await writeAudit(identity, "integration.connect", "integration", parsed.kind, parsed);
  return { ok: true };
}

const disconnectSchema = z.object({ kind: KIND_SCHEMA });

export async function disconnectIntegration(identity: AdminIdentity, input: unknown) {
  const parsed = disconnectSchema.parse(input);
  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(integrationSettings)
    .where(
      and(
        eq(integrationSettings.projectId, identity.projectId),
        eq(integrationSettings.kind, parsed.kind),
      )!,
    )
    .limit(1);
  if (!existing[0] || existing[0].status !== "connected") {
    throw new ApiError("Integration is not connected", 404);
  }

  await db
    .update(integrationSettings)
    .set({ status: "available", connectedAt: null, config: null, updatedAt: now })
    .where(
      and(
        eq(integrationSettings.projectId, identity.projectId),
        eq(integrationSettings.kind, parsed.kind),
      )!,
    );

  await writeAudit(identity, "integration.disconnect", "integration", parsed.kind, parsed);
  return { ok: true };
}
