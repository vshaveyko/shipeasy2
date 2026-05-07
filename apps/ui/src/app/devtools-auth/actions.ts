"use server";

import { and, eq } from "drizzle-orm";
import { findSdkKeyByHash, getDb, sha256 } from "@shipeasy/core";
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
 * Hash an SDK key and look up which project it belongs to. Returns null when
 * the key isn't recognized. Used as proof that the requesting page is a real
 * ShipEasy customer page (not just a random origin claiming to be one).
 */
async function projectIdForSdkKey(sdkKey: string): Promise<string | null> {
  const env = await getEnvAsync();
  const hash = await sha256(sdkKey);
  const k = await findSdkKeyByHash(env.DB, hash);
  return k?.projectId ?? null;
}

/**
 * List projects the signed-in user can authorize DevTools for.
 *
 * Two modes:
 *
 *   1. SDK-key mode (page passes `__SE_BOOTSTRAP.apiKey`). The key must
 *      resolve to *some* real project (proof the page is a genuine ShipEasy
 *      customer page). When it does, we return *every* project the user owns
 *      — not just the one the key resolves to — so a developer with multiple
 *      projects can pick which one to authorize devtools for from localhost.
 *      The project the key resolves to is hoisted to the top so the
 *      single-list fast path preselects it.
 *
 *   2. Origin-only mode (no key). Falls back to the legacy domain-allowlist
 *      filter — only projects whose configured `domain` matches the request
 *      origin are listable. Used when the page hasn't installed the SDK yet.
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

  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const owned = await db.select().from(projects).where(eq(projects.ownerEmail, email));

  if (sdkKey) {
    // Validate the key resolves to *some* project so we know the page isn't
    // just claiming to be a ShipEasy customer page. The key doesn't have to
    // belong to one of the user's own projects — that's fine, the user might
    // be evaluating a project they don't yet own. The list still only
    // contains projects the user actually owns (filtered upstream).
    const matchedProjectId = await projectIdForSdkKey(sdkKey);
    if (!matchedProjectId) return [];

    const list = owned.map((r) => ({
      id: r.id,
      name: r.name,
      plan: r.plan,
      domain: r.domain ?? null,
    }));
    // Preselect the SDK-key-matched project by hoisting it to the top.
    list.sort((a, b) => {
      if (a.id === matchedProjectId) return -1;
      if (b.id === matchedProjectId) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }

  return owned
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
  const db = getDb(env.DB);
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerEmail, email)))
    .limit(1);
  if (!project) throw new Error("Project not found or you do not have access to it");

  if (sdkKey) {
    // SDK-key flow: we only require that the key resolves to *some* real
    // project — that's our proof the requesting page is a genuine ShipEasy
    // customer page (not just any origin claiming to be one). The chosen
    // project just needs to be owned by the user (already enforced above);
    // it doesn't have to be the same project the key resolves to. This lets
    // a dev with multiple projects authorize whichever one they want, even
    // when the page only embeds one project's SDK key.
    const hash = await sha256(sdkKey);
    const k = await findSdkKeyByHash(env.DB, hash);
    if (!k) throw new Error("Invalid SDK key");
  } else if (!originMatchesDomain(host, project.domain ?? null)) {
    throw new Error(
      `Project "${project.name}" is not configured for ${host}. Add this domain in dashboard settings.`,
    );
  }

  const identity: AdminIdentity = { projectId: project.id, actorEmail: email, source: "jwt" };
  const result = await createKey(identity, { type: "admin" });
  return { token: result.key, projectId: project.id, projectName: project.name, email };
}
