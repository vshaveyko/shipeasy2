import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@shipeasy/core";
import {
  notificationPrefs,
  type NotificationEventKey,
} from "@shipeasy/core/db/schema";
import { getEnvAsync } from "../env";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

export const NOTIFICATION_EVENTS: { key: NotificationEventKey; label: string }[] = [
  { key: "experiment.significance", label: "Experiment reaches significance" },
  { key: "guardrail.breached", label: "Guardrail breached" },
  { key: "killswitch.flipped", label: "Killswitch flipped" },
  { key: "config.published.prod", label: "Config published to prod" },
  { key: "team.member.joined", label: "New team member joins" },
  { key: "digest.weekly", label: "Weekly experimentation digest" },
];

const NOTIFICATION_DEFAULTS: Record<
  NotificationEventKey,
  { email: boolean; slack: boolean; claudeDm: boolean }
> = {
  "experiment.significance": { email: true, slack: true, claudeDm: true },
  "guardrail.breached": { email: true, slack: true, claudeDm: true },
  "killswitch.flipped": { email: false, slack: true, claudeDm: true },
  "config.published.prod": { email: false, slack: true, claudeDm: false },
  "team.member.joined": { email: true, slack: false, claudeDm: false },
  "digest.weekly": { email: true, slack: false, claudeDm: false },
};

export type NotificationPrefRow = {
  event: NotificationEventKey;
  label: string;
  email: boolean;
  slack: boolean;
  claudeDm: boolean;
};

export async function listNotificationPrefs(
  identity: AdminIdentity,
): Promise<NotificationPrefRow[]> {
  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const rows = await db
    .select()
    .from(notificationPrefs)
    .where(eq(notificationPrefs.projectId, identity.projectId));
  const byEvent = new Map(rows.map((r) => [r.event as NotificationEventKey, r] as const));
  return NOTIFICATION_EVENTS.map(({ key, label }) => {
    const row = byEvent.get(key);
    const def = NOTIFICATION_DEFAULTS[key];
    return {
      event: key,
      label,
      email: row?.email ?? def.email,
      slack: row?.slack ?? def.slack,
      claudeDm: row?.claudeDm ?? def.claudeDm,
    };
  });
}

const updatePrefSchema = z.object({
  event: z.enum([
    "experiment.significance",
    "guardrail.breached",
    "killswitch.flipped",
    "config.published.prod",
    "team.member.joined",
    "digest.weekly",
  ]),
  email: z.boolean(),
  slack: z.boolean(),
  claudeDm: z.boolean(),
});

export async function updateNotificationPref(identity: AdminIdentity, input: unknown) {
  const parsed = updatePrefSchema.parse(input);
  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const now = new Date().toISOString();

  await db
    .insert(notificationPrefs)
    .values({
      projectId: identity.projectId,
      event: parsed.event,
      email: parsed.email,
      slack: parsed.slack,
      claudeDm: parsed.claudeDm,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [notificationPrefs.projectId, notificationPrefs.event],
      set: {
        email: parsed.email,
        slack: parsed.slack,
        claudeDm: parsed.claudeDm,
        updatedAt: now,
      },
    });

  await writeAudit(identity, "notification_pref.update", "notification_pref", parsed.event, parsed);
  return { ok: true };
}

export async function resetNotificationPrefs(identity: AdminIdentity) {
  const env = await getEnvAsync();
  const db = getDb(env.DB);
  await db.delete(notificationPrefs).where(eq(notificationPrefs.projectId, identity.projectId));
  await writeAudit(identity, "notification_pref.reset", "notification_pref", identity.projectId, {});
  return { ok: true };
}

