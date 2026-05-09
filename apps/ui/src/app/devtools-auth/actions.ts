"use server";

import { eq } from "drizzle-orm";
import {
  findSdkKeyByHash,
  getDb,
  hasProjectAccess,
  listAccessibleProjects,
  sha256,
} from "@shipeasy/core";
import { projects } from "@shipeasy/core/db/schema";
import { createKey } from "@/lib/handlers/keys";
import type { AdminIdentity } from "@/lib/admin-auth";
import { auth } from "@/auth";
import { getEnvAsync } from "@/lib/env";

export interface ProjectOption {
  id: string;
  name: string;
  plan: string;
  domain: string | null;
}

/**
 * Mirrors the worker's `originAllowed` rule (see packages/worker/src/lib/auth.ts).
 * Devtools should only authorize a project whose configured domain matches the
 * site the overlay is running on — otherwise tokens leak across customers.
 */
function originMatchesDomain(host: string, domain: string | null): boolean {
  if (!domain) return false;
  if (domain.startsWith("*.")) return host.endsWith(domain.slice(1));
  return host === domain || host === `www.${domain}`;
}

export interface DevtoolsAuthResult {
  token: string;
  projectId: string;
  projectName: string;
  email: string;
}

/**
 * Resolve a customer SDK client key (e.g. `sdk_client_…`) to the project it
 * belongs to. Returns the project only if the signed-in user owns it OR is
 * an active member — otherwise we'd let an unrelated user mint an admin
 * token for a project just because they happened to load a page that
 * exposes that project's client key.
 */
async function resolveProjectFromSdkKey(
  sdkKey: string,
  actorEmail: string,
): Promise<ProjectOption | null> {
  const env = await getEnvAsync();
  const hash = await sha256(sdkKey);
  const k = await findSdkKeyByHash(env.DB, hash);
  if (!k) return null;
  const allowed = await hasProjectAccess(env.DB, k.projectId, actorEmail);
  if (!allowed) return null;
  const db = getDb(env.DB);
  const [project] = await db.select().from(projects).where(eq(projects.id, k.projectId)).limit(1);
  if (!project) return null;
  return { id: project.id, name: project.name, plan: project.plan, domain: project.domain ?? null };
}

/**
 * List projects the signed-in user can authorize DevTools for.
 *
 * When the page passes its SDK client key (read from `__SE_BOOTSTRAP.apiKey`),
 * we return *only* the project that key belongs to — the SDK key is the
 * project identity, so devtools can only authorize against the project the
 * page is actually wired to. Lets a dev on localhost authorize their real
 * production project without first allow-listing localhost in dashboard
 * settings.
 *
 * Without a key, we fall back to the legacy domain-match flow (allowlist the
 * origin under dashboard settings).
 */
export async function listDevtoolsProjectsAction(
  origin: string,
  sdkKey?: string | null,
): Promise<ProjectOption[]> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Not signed in");

  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    throw new Error("Invalid origin");
  }

  if (sdkKey) {
    const p = await resolveProjectFromSdkKey(sdkKey, email);
    return p ? [p] : [];
  }

  const env = await getEnvAsync();
  const rows = await listAccessibleProjects(env.DB, email);
  return rows
    .filter((r) => originMatchesDomain(host, r.domain ?? null))
    .map((r) => ({ id: r.id, name: r.name, plan: r.plan, domain: r.domain ?? null }));
}

/**
 * Mints a fresh admin SDK key for the chosen project (must be owned by the
 * signed-in user) and returns it so the popup can postMessage it back to
 * the opener.
 */
export async function approveDevtoolsAuthAction(
  projectId: string,
  origin: string,
  sdkKey?: string | null,
): Promise<DevtoolsAuthResult> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Not signed in");
  if (!projectId) throw new Error("Project is required");

  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    throw new Error("Invalid origin");
  }

  const env = await getEnvAsync();
  const allowed = await hasProjectAccess(env.DB, projectId, email);
  if (!allowed) throw new Error("Project not found or you do not have access to it");
  const db = getDb(env.DB);
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error("Project not found or you do not have access to it");

  if (sdkKey) {
    // Defense in depth: the SDK key the popup received must hash to a key
    // row that belongs to the chosen project. The key *is* the project
    // identity in this flow — devtools can only authorize against the
    // project the page is actually wired to.
    const hash = await sha256(sdkKey);
    const k = await findSdkKeyByHash(env.DB, hash);
    if (!k || k.projectId !== project.id) {
      throw new Error("SDK key does not match the selected project");
    }
    // SDK-key flow trusts the key as proof-of-project — skip the
    // domain-allowlist check that the origin-only flow uses.
  } else if (!originMatchesDomain(host, project.domain ?? null)) {
    throw new Error(
      `Project "${project.name}" is not configured for ${host}. Add this domain in dashboard settings.`,
    );
  }

  const identity: AdminIdentity = { projectId: project.id, actorEmail: email, source: "jwt" };
  const result = await createKey(identity, { type: "admin" });
  return { token: result.key, projectId: project.id, projectName: project.name, email };
}
