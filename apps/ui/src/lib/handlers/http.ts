import { z } from "zod";
import { ApiError } from "@shipeasy/core";
import { authenticateAdmin, errorResponse, type AdminIdentity } from "../admin-auth";
import { getEnvAsync } from "../env";

/**
 * Warm the OpenNext Cloudflare context so subsequent sync getEnv() calls
 * (used by scopedDb, etc.) don't throw in Route Handlers. Without this,
 * any handler that uses scopedDb trips on the first sync getCloudflareContext()
 * invocation because nothing else has initialised it yet.
 */
async function warmCloudflareContext(): Promise<void> {
  await getEnvAsync();
}

export async function withAdmin(
  req: Request,
  handler: (identity: AdminIdentity) => Promise<unknown>,
): Promise<Response> {
  try {
    await warmCloudflareContext();
    const identity = await authenticateAdmin(req);
    const body = await handler(identity);
    return Response.json(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation failed", issues: err.issues }, { status: 422 });
    }
    if (err instanceof ApiError) {
      return Response.json(
        { error: err.message, ...(err.code ? { code: err.code } : {}) },
        { status: err.status },
      );
    }
    return errorResponse(err);
  }
}

export async function withAdminCreated(
  req: Request,
  handler: (identity: AdminIdentity) => Promise<unknown>,
): Promise<Response> {
  try {
    await warmCloudflareContext();
    const identity = await authenticateAdmin(req);
    const body = await handler(identity);
    return Response.json(body, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation failed", issues: err.issues }, { status: 422 });
    }
    if (err instanceof ApiError) {
      return Response.json(
        { error: err.message, ...(err.code ? { code: err.code } : {}) },
        { status: err.status },
      );
    }
    return errorResponse(err);
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
}
