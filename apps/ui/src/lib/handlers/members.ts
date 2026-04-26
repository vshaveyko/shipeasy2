import { eq, sql } from "drizzle-orm";
import { ApiError } from "@shipeasy/core";
import {
  projectMembers,
  type ProjectMemberRole,
  type ProjectMemberStatus,
} from "@shipeasy/core/db/schema";
import { scopedDb, scopedDbSA } from "../db";
import { loadProject } from "../project";
import { writeAudit } from "../audit";
import type { AdminIdentity } from "../admin-auth";

const VALID_ROLES: ProjectMemberRole[] = ["admin", "editor", "viewer"];

function normalizeEmail(raw: unknown): string {
  if (typeof raw !== "string") throw new ApiError("Email is required", 400);
  const e = raw.trim().toLowerCase();
  if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    throw new ApiError(`Invalid email: ${raw}`, 400);
  }
  return e;
}

function assertRole(raw: unknown): ProjectMemberRole {
  if (typeof raw === "string" && (VALID_ROLES as string[]).includes(raw)) {
    return raw as ProjectMemberRole;
  }
  throw new ApiError(`Invalid role: ${String(raw)}`, 400);
}

async function assertOwner(identity: AdminIdentity): Promise<void> {
  const project = await loadProject(identity.projectId);
  if (project.ownerEmail.toLowerCase() !== identity.actorEmail.toLowerCase()) {
    throw new ApiError("Only the workspace owner can manage members", 403);
  }
}

export async function listMembers(identity: AdminIdentity) {
  const s = scopedDb(identity.projectId);
  const rows = await s.select(projectMembers);
  return rows.filter((r) => r.status !== "removed");
}

export async function inviteMember(
  identity: AdminIdentity,
  input: { email: string; role: string },
) {
  await assertOwner(identity);
  const email = normalizeEmail(input.email);
  const role = assertRole(input.role);

  const project = await loadProject(identity.projectId);
  if (project.ownerEmail.toLowerCase() === email) {
    throw new ApiError("The owner cannot be invited as a member", 400);
  }

  const s = await scopedDbSA(identity.projectId);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await s.insert(projectMembers).values({
      id,
      email,
      role,
      status: "pending",
      invitedByEmail: identity.actorEmail,
      invitedAt: now,
    });
  } catch (err) {
    if (err instanceof Error && /UNIQUE|project_members_project_email/i.test(err.message)) {
      throw new ApiError(`${email} is already a member`, 409);
    }
    throw err;
  }

  await writeAudit(identity, "member.invite", "project_member", id, { email, role });
  return { id, email, role, status: "pending" satisfies ProjectMemberStatus };
}

export async function removeMember(identity: AdminIdentity, id: string) {
  await assertOwner(identity);
  const s = await scopedDbSA(identity.projectId);
  await s.delete(projectMembers).where(eq(projectMembers.id, id));
  await writeAudit(identity, "member.remove", "project_member", id, {});
}

export async function updateMemberRole(identity: AdminIdentity, id: string, role: string) {
  await assertOwner(identity);
  const next = assertRole(role);
  const s = await scopedDbSA(identity.projectId);
  await s.update(projectMembers).set({ role: next }).where(eq(projectMembers.id, id));
  await writeAudit(identity, "member.role", "project_member", id, { role: next });
}

export async function acceptInvite(identity: AdminIdentity, id: string) {
  // Accept-flow stub for the invitee. Marks pending → active. Owner can also call this.
  const s = await scopedDbSA(identity.projectId);
  await s
    .update(projectMembers)
    .set({ status: "active", acceptedAt: new Date().toISOString() })
    .where(sql`${projectMembers.id} = ${id} AND ${projectMembers.status} = 'pending'`);
}
