import { auth } from "@/auth";
import { validateSdkKey, ApiError } from "@shipeasy/core";
import { getEnvAsync } from "./env";

export interface AdminIdentity {
  projectId: string;
  actorEmail: string;
  source: "jwt" | "sdk_key";
}

export async function authenticateAdmin(req?: Request): Promise<AdminIdentity> {
  const session = await auth();
  const projectId = (session?.user as { project_id?: string } | undefined)?.project_id;
  if (session?.user && projectId) {
    return {
      projectId,
      actorEmail: session.user.email ?? "unknown",
      source: "jwt",
    };
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
      return { projectId: meta.project_id, actorEmail: "cli", source: "sdk_key" };
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
  console.error("admin api error:", err);
  const message = err instanceof Error ? err.message : String(err);
  return Response.json({ error: "Internal server error", detail: message }, { status: 500 });
}
