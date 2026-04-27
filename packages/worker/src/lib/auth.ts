// SDK key auth middleware for Hono.
// Uses @shipeasy/core validateSdkKey (module-scope cached KV lookup).

import { validateSdkKey, type SdkKeyMeta, type SdkKeyType } from "@shipeasy/core";
import type { Context, Next } from "hono";
import type { WorkerEnv } from "../env";

export type AuthedContext = Context<{ Bindings: WorkerEnv; Variables: { key: SdkKeyMeta } }>;

/** Returns true if the request origin matches the project's stored domain pattern. */
function originAllowed(
  requestOrigin: string | null,
  allowedOrigin: string | null | undefined,
): boolean {
  if (!allowedOrigin) return true; // project hasn't configured a domain yet — allow all
  if (!requestOrigin) return false;
  try {
    const host = new URL(requestOrigin).hostname;
    // Support wildcard prefix: "*.example.com" matches "app.example.com"
    if (allowedOrigin.startsWith("*.")) {
      return host.endsWith(allowedOrigin.slice(1));
    }
    return host === allowedOrigin || host === `www.${allowedOrigin}`;
  } catch {
    return false;
  }
}

export function requireKey(keyType: SdkKeyType) {
  return async (c: AuthedContext, next: Next) => {
    const raw =
      c.req.header("X-SDK-Key") ??
      (c.req.header("Authorization")?.startsWith("Bearer ")
        ? c.req.header("Authorization")!.slice(7)
        : undefined);
    if (!raw) return c.text("Unauthorized", 401);

    const meta = await validateSdkKey(raw, keyType, c.env.FLAGS_KV);
    if (!meta) return c.text("Unauthorized", 401);

    // Client keys are browser-only: enforce Origin matches the project domain.
    if (meta.type === "client") {
      const origin = c.req.header("Origin") ?? c.req.header("Referer");
      if (!originAllowed(origin ?? null, meta.allowed_origin)) {
        return c.text("Forbidden: origin not allowed", 403);
      }
    }

    c.set("key", meta);
    await next();
  };
}
