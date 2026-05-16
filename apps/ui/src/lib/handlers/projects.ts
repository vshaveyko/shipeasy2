import { and, eq, gte, count } from "drizzle-orm";
import { z } from "zod";
import {
  ApiError,
  findProjectById,
  findProjectByOwnerAndDomain,
  insertProject,
  updateProject as updateProjectRow,
  getDb,
} from "@shipeasy/core";
import {
  gates,
  configs,
  experiments,
  universes,
  metrics,
  events,
  auditLog,
  projects as projectsTable,
  projectMembers,
  sdkKeys,
  type ProjectMemberRole,
} from "@shipeasy/core/db/schema";
import {
  projectDomainSchema,
  projectUpdateSchema,
  projectPlanUpdateSchema,
} from "@shipeasy/core/schemas/keys";
import { getEnv, getEnvAsync } from "../env";
import { writeAudit } from "../audit";
import { rebuildFlags, rebuildExperiments } from "@shipeasy/core";
import type { AdminIdentity } from "../admin-auth";

export async function getProject(identity: AdminIdentity, id: string) {
  if (id !== identity.projectId) throw new ApiError("Forbidden", 403);
  const env = getEnv();
  const project = await findProjectById(env.DB, id);
  if (!project) throw new ApiError("Project not found", 404);
  return project;
}

export async function updateProject(identity: AdminIdentity, id: string, input: unknown) {
  if (id !== identity.projectId) throw new ApiError("Forbidden", 403);
  const parsed = projectUpdateSchema.parse(input);
  const env = await getEnvAsync();

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.name !== undefined) patch.name = parsed.name;
  if (parsed.domain !== undefined) patch.domain = parsed.domain;
  if (parsed.slug !== undefined) patch.slug = parsed.slug;
  if (parsed.defaultEnv !== undefined) patch.defaultEnv = parsed.defaultEnv;
  if (parsed.timezone !== undefined) patch.timezone = parsed.timezone;
  if (parsed.statMethod !== undefined) patch.statMethod = parsed.statMethod;
  if (parsed.sigThreshold !== undefined) patch.sigThreshold = parsed.sigThreshold;
  if (parsed.autoRollback !== undefined) patch.autoRollback = parsed.autoRollback;
  if (parsed.minSampleDays !== undefined) patch.minSampleDays = parsed.minSampleDays;
  if (parsed.moduleTranslations !== undefined) patch.moduleTranslations = parsed.moduleTranslations;
  if (parsed.moduleConfigs !== undefined) patch.moduleConfigs = parsed.moduleConfigs;
  if (parsed.moduleGates !== undefined) patch.moduleGates = parsed.moduleGates;
  if (parsed.moduleExperiments !== undefined) patch.moduleExperiments = parsed.moduleExperiments;
  if (parsed.moduleFeedback !== undefined) patch.moduleFeedback = parsed.moduleFeedback;
  if (parsed.moduleUser !== undefined) patch.moduleUser = parsed.moduleUser;
  if (parsed.moduleEvents !== undefined) patch.moduleEvents = parsed.moduleEvents;

  await updateProjectRow(env.DB, id, patch);
  await writeAudit(identity, "project.update", "project", id, parsed);
  return getProject(identity, id);
}

/**
 * Upsert a project keyed by `(owner_email, domain)`.
 *
 * The owner is derived from the project the caller's CLI session token is
 * already scoped to — i.e., a CLI session for project A under
 * cdewqzx@gmail.com can mint additional projects under the same owner. This
 * is intentional: it gives the install flow a way to create per-app
 * projects without forcing the user back to the dashboard, while still
 * preventing one tenant from creating projects under another tenant's
 * email.
 *
 * Idempotent: second call with the same `(owner_email, domain)` returns
 * the existing row with `created: false`.
 */
const projectUpsertSchema = z.object({
  domain: projectDomainSchema,
  name: z.string().min(1).max(100).optional(),
});

export async function upsertProject(identity: AdminIdentity, input: unknown) {
  const parsed = projectUpsertSchema.parse(input);
  const env = await getEnvAsync();

  // Resolve owner via the caller's currently-scoped project (the CLI session
  // is project-scoped, not user-scoped, so this is the only path).
  const callerProject = await findProjectById(env.DB, identity.projectId);
  if (!callerProject) throw new ApiError("Caller project not found", 404);
  const ownerEmail = callerProject.ownerEmail;

  const existing = await findProjectByOwnerAndDomain(env.DB, ownerEmail, parsed.domain);
  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      domain: existing.domain,
      owner_email: existing.ownerEmail,
      created: false,
    };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const name = parsed.name ?? parsed.domain;
  await insertProject(env.DB, {
    id,
    name,
    domain: parsed.domain,
    ownerEmail,
    plan: "free",
    status: "active",
    subscriptionStatus: "none",
    cancelAtPeriodEnd: 0,
    billingInterval: "monthly",
    createdAt: now,
    updatedAt: now,
  });
  await writeAudit(identity, "project.create", "project", id, {
    name,
    domain: parsed.domain,
    via: "upsert",
  });
  return {
    id,
    name,
    domain: parsed.domain,
    owner_email: ownerEmail,
    created: true,
  };
}

export async function updateProjectPlan(identity: AdminIdentity, id: string, input: unknown) {
  if (id !== identity.projectId) throw new ApiError("Forbidden", 403);
  const parsed = projectPlanUpdateSchema.parse(input);
  const env = await getEnvAsync();

  await updateProjectRow(env.DB, id, {
    plan: parsed.plan,
    updatedAt: new Date().toISOString(),
  });
  await rebuildFlags(env, id, parsed.plan);
  await rebuildExperiments(env, id);
  await writeAudit(identity, "project.plan", "project", id, parsed);
  return getProject(identity, id);
}

/**
 * Soft-delete a project. Stamps `deleted_at` so the row stops appearing in
 * listings but stays recoverable for 14 days; a cleanup job purges expired
 * rows. Refuses if the caller is not the current owner.
 */
export async function softDeleteProject(identity: AdminIdentity, id: string, confirmName: string) {
  if (id !== identity.projectId) throw new ApiError("Forbidden", 403);
  const env = await getEnvAsync();
  const project = await findProjectById(env.DB, id);
  if (!project) throw new ApiError("Project not found", 404);

  const owner = project.ownerEmail.trim().toLowerCase();
  const actor = identity.actorEmail.trim().toLowerCase();
  if (owner !== actor) throw new ApiError("Only the current owner can delete this project", 403);

  if ((confirmName ?? "").trim() !== project.name) {
    throw new ApiError(`Type the project name "${project.name}" to confirm`, 400);
  }

  const now = new Date().toISOString();
  await updateProjectRow(env.DB, id, { deletedAt: now, status: "inactive", updatedAt: now });
  await writeAudit(identity, "project.soft_delete", "project", id, { name: project.name });
  return { ok: true, name: project.name, purgeAt: new Date(Date.now() + 14 * 86400_000).toISOString() };
}

/**
 * Hard-delete a project. Refuses if the project still has any user-owned
 * data (gates, configs, experiments, universes, metrics, events) — the user
 * must clear those first. Cleans up auxiliary rows tied to the project so
 * the row can be removed without orphaning members or SDK keys.
 */
export async function deleteProject(identity: AdminIdentity, id: string) {
  if (id !== identity.projectId) throw new ApiError("Forbidden", 403);
  const env = await getEnvAsync();
  const db = getDb(env.DB);

  const project = await findProjectById(env.DB, id);
  if (!project) throw new ApiError("Project not found", 404);

  const [g, c, e, u, m, ev] = await Promise.all([
    db.select({ n: count() }).from(gates).where(eq(gates.projectId, id)),
    db.select({ n: count() }).from(configs).where(eq(configs.projectId, id)),
    db.select({ n: count() }).from(experiments).where(eq(experiments.projectId, id)),
    db.select({ n: count() }).from(universes).where(eq(universes.projectId, id)),
    db.select({ n: count() }).from(metrics).where(eq(metrics.projectId, id)),
    db.select({ n: count() }).from(events).where(eq(events.projectId, id)),
  ]);

  const counts = {
    gates: g[0]?.n ?? 0,
    configs: c[0]?.n ?? 0,
    experiments: e[0]?.n ?? 0,
    universes: u[0]?.n ?? 0,
    metrics: m[0]?.n ?? 0,
    events: ev[0]?.n ?? 0,
  };
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  if (total > 0) {
    const non = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${n} ${k}`)
      .join(", ");
    throw new ApiError(`Project still has ${non}. Delete those first.`, 409);
  }

  await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
  await db.delete(sdkKeys).where(eq(sdkKeys.projectId, id));
  await db.delete(auditLog).where(eq(auditLog.projectId, id));
  await db.delete(projectsTable).where(eq(projectsTable.id, id));

  return { ok: true, name: project.name, domain: project.domain };
}

/**
 * Transfer project ownership to an existing active member. The old owner is
 * inserted into `project_members` as an `admin` (active), so they keep access
 * until explicitly removed by the new owner. KV blobs and project-scoped
 * resources are owner-agnostic (scoped only by `project_id`), so no rebuild
 * or data migration is needed.
 */
const TRANSFER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function transferOwnership(
  identity: AdminIdentity,
  id: string,
  input: { targetEmail: string; confirmName: string },
) {
  if (id !== identity.projectId) throw new ApiError("Forbidden", 403);
  const env = await getEnvAsync();
  const db = getDb(env.DB);

  const project = await findProjectById(env.DB, id);
  if (!project) throw new ApiError("Project not found", 404);

  const oldOwner = project.ownerEmail.trim().toLowerCase();
  const actor = identity.actorEmail.trim().toLowerCase();
  if (oldOwner !== actor) {
    throw new ApiError("Only the current owner can transfer this project", 403);
  }

  const targetRaw = typeof input.targetEmail === "string" ? input.targetEmail : "";
  const newOwner = targetRaw.trim().toLowerCase();
  if (!newOwner || !TRANSFER_EMAIL_RE.test(newOwner)) {
    throw new ApiError("Invalid target email", 400);
  }
  if (newOwner === oldOwner) {
    throw new ApiError("Target is already the owner", 400);
  }

  const confirmName = typeof input.confirmName === "string" ? input.confirmName.trim() : "";
  if (confirmName !== project.name) {
    throw new ApiError(`Type the project name "${project.name}" to confirm`, 400);
  }

  // Target must already be an active member — keeps ownership from landing on
  // someone who hasn't accepted access. Pending invites are not eligible.
  const targetRows = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, id), eq(projectMembers.email, newOwner))!)
    .limit(1);
  const targetRow = targetRows[0];
  if (!targetRow || targetRow.status !== "active") {
    throw new ApiError(
      "Target must already be an active member of this project. Invite and have them accept first.",
      400,
    );
  }

  // (owner_email, domain) is unique — refuse if the new owner already owns
  // another project on the same domain.
  if (project.domain) {
    const collision = await findProjectByOwnerAndDomain(env.DB, newOwner, project.domain);
    if (collision && collision.id !== id) {
      throw new ApiError(`${newOwner} already owns a project on domain "${project.domain}"`, 409);
    }
  }

  const now = new Date().toISOString();
  const oldOwnerMemberId = crypto.randomUUID();
  const role: ProjectMemberRole = "admin";

  // Atomic flip via D1 batch: drop target's member row, drop any stale old-owner
  // row, insert old owner as admin member, update project.ownerEmail.
  await env.DB.batch([
    env.DB.prepare("DELETE FROM project_members WHERE project_id = ? AND email = ?").bind(
      id,
      newOwner,
    ),
    env.DB.prepare("DELETE FROM project_members WHERE project_id = ? AND email = ?").bind(
      id,
      oldOwner,
    ),
    env.DB.prepare(
      "INSERT INTO project_members (id, project_id, email, role, status, invited_by_email, invited_at, accepted_at) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)",
    ).bind(oldOwnerMemberId, id, oldOwner, role, newOwner, now, now),
    env.DB.prepare("UPDATE projects SET owner_email = ?, updated_at = ? WHERE id = ?").bind(
      newOwner,
      now,
      id,
    ),
  ]);

  await writeAudit(identity, "project.transfer_ownership", "project", id, {
    from: oldOwner,
    to: newOwner,
  });

  return { ok: true, from: oldOwner, to: newOwner, projectId: id };
}

export async function getStorage(identity: AdminIdentity, id: string) {
  if (id !== identity.projectId) throw new ApiError("Forbidden", 403);
  const env = getEnv();
  const db = getDb(env.DB);

  const [gateCount, configCount, experimentCount, universeCount, metricCount, eventCount] =
    await Promise.all([
      db.select({ n: count() }).from(gates).where(eq(gates.projectId, id)),
      db.select({ n: count() }).from(configs).where(eq(configs.projectId, id)),
      db.select({ n: count() }).from(experiments).where(eq(experiments.projectId, id)),
      db.select({ n: count() }).from(universes).where(eq(universes.projectId, id)),
      db.select({ n: count() }).from(metrics).where(eq(metrics.projectId, id)),
      db.select({ n: count() }).from(events).where(eq(events.projectId, id)),
    ]);

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const recentAudit = await db
    .select({ n: count() })
    .from(auditLog)
    .where(and(eq(auditLog.projectId, id), gte(auditLog.createdAt, since)));

  return {
    projectId: id,
    counts: {
      gates: gateCount[0]?.n ?? 0,
      configs: configCount[0]?.n ?? 0,
      experiments: experimentCount[0]?.n ?? 0,
      universes: universeCount[0]?.n ?? 0,
      metrics: metricCount[0]?.n ?? 0,
      events: eventCount[0]?.n ?? 0,
      audit_last_24h: recentAudit[0]?.n ?? 0,
    },
  };
}
