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

/**
 * Add CORS headers so the devtools overlay can read /api/admin/* from any
 * origin (its admin Bearer token is the gating factor; cookies stay
 * off-limits with credentials:false). We do it inline rather than via a
 * Next middleware because middleware.ts forces the worker to ship both
 * the Node and Edge server runtimes — that doubled the bundle by ~140 KiB
 * gzipped, more than the entire CORS layer is worth.
 */
function applyCors(req: Request, res: Response): Response {
  const origin = req.headers.get("origin") ?? "*";
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-SDK-Key");
  res.headers.set("Access-Control-Max-Age", "600");
  return res;
}

/**
 * Cheap OPTIONS preflight reply — the route handlers themselves still
 * need to export `OPTIONS = corsPreflight` for browsers to call them
 * (Next 404s on missing methods otherwise).
 */
export function corsPreflight(req: Request): Response {
  return applyCors(req, new Response(null, { status: 204 }));
}

export async function withAdmin(
  req: Request,
  handler: (identity: AdminIdentity) => Promise<unknown>,
): Promise<Response> {
  try {
    await warmCloudflareContext();
    const identity = await authenticateAdmin(req);
    const body = await handler(identity);
    return applyCors(req, Response.json(body));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return applyCors(
        req,
        Response.json({ error: "Validation failed", issues: err.issues }, { status: 422 }),
      );
    }
    if (err instanceof ApiError) {
      return applyCors(
        req,
        Response.json(
          { error: err.message, ...(err.code ? { code: err.code } : {}) },
          { status: err.status },
        ),
      );
    }
    return applyCors(req, errorResponse(err));
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
    return applyCors(req, Response.json(body, { status: 201 }));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return applyCors(
        req,
        Response.json({ error: "Validation failed", issues: err.issues }, { status: 422 }),
      );
    }
    if (err instanceof ApiError) {
      return applyCors(
        req,
        Response.json(
          { error: err.message, ...(err.code ? { code: err.code } : {}) },
          { status: err.status },
        ),
      );
    }
    return applyCors(req, errorResponse(err));
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
}
