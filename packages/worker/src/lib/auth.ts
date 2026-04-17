// SDK key auth middleware for Hono.
// Uses @shipeasy/core validateSdkKey (module-scope cached KV lookup).

import { validateSdkKey, type SdkKeyMeta, type SdkKeyType } from "@shipeasy/core";
import type { Context, Next } from "hono";
import type { WorkerEnv } from "../env";

export type AuthedContext = Context<{ Bindings: WorkerEnv; Variables: { key: SdkKeyMeta } }>;

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

    c.set("key", meta);
    await next();
  };
}
