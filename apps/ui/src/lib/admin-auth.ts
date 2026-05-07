import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { validateSdkKey, ApiError, getDb } from "@shipeasy/core";
import { projectMembers } from "@shipeasy/core/db/schema";
import { getEnvAsync } from "./env";

export interface AdminIdentity {
  projectId: string;
  actorEmail: string;
  source: "jwt" | "sdk_key";
}

/**
 * Cross-project override: if the request includes `X-Project-Id` and that
 * differs from the auth-derived project, allow it iff the actor email is an
 * accepted, non-removed admin member of the target project. Returns the
 * resolved project id (or the original if no override applies).
 *
 * Returning the original on missing-actor (sdk_key created before we tracked
 * createdByEmail) keeps existing CLI sessions working — they just can't use
 * --project until they re-login.
 */
async function resolveProjectOverride(
  req: Request,
  defaultProjectId: string,
  actorEmail: string | null,
): Promise<string> {
  const target = req.headers.get("X-Project-Id");
  if (!target || target === defaultProjectId) return defaultProjectId;
  if (!actorEmail) {
    throw new ApiError(
      "Cross-project access requires re-authentication: run `shipeasy login` again",
      403,
    );
  }
  const env = await getEnvAsync();
  const db = getDb(env.DB);
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, target),
        eq(projectMembers.email, actorEmail),
        eq(projectMembers.role, "admin"),
        isNull(projectMembers.removedAt),
      ),
    )
    .limit(1);
  if (!member || !member.acceptedAt) {
    throw new ApiError(`Not an admin of project ${target}`, 403);
  }
  return target;
}

export async function authenticateAdmin(req?: Request): Promise<AdminIdentity> {
  const session = await auth();
  const projectId = (session?.user as { project_id?: string } | undefined)?.project_id;
  if (session?.user && projectId) {
    const actorEmail = session.user.email ?? "unknown";
    const resolved = req ? await resolveProjectOverride(req, projectId, actorEmail) : projectId;
    return { projectId: resolved, actorEmail, source: "jwt" };
  }

  if (req) {
    const sdkKey = req.headers.get("X-SDK-Key") ?? req.headers.get("Authorization")?.slice(7);
    if (sdkKey) {
      // getEnvAsync initialises the Cloudflare context when the request has
      // no session cookie to warm it (SDK-key only requests, e.g. the devtools
      // overlay). The sync getEnv() throws on cold context in `next dev`.
      const env = await getEnvAsync();
      const meta = await validateSdkKey(sdkKey, "admin", env.FLAGS_KV);
      if (!meta) throw new ApiError("Invalid or expired SDK key", 401);
      const actorEmail = meta.created_by_email ?? null;
      const resolved = await resolveProjectOverride(req, meta.project_id, actorEmail);
      return {
        projectId: resolved,
        actorEmail: actorEmail ?? "cli",
        source: "sdk_key",
      };
    }
  }

  throw new ApiError("Not authenticated", 401);
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      { error: err.message, ...(err.code ? { code: err.code } : {}) },
      {
        status: err.status,
      },
    );
  }
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  // Log to CF logpush / wrangler tail with full stack for post-mortem.
  console.error("admin api error:", message, stack);
  return Response.json(
    { error: "Internal server error", detail: message, stack: stack?.split("\n").slice(0, 6) },
    { status: 500 },
  );
}
