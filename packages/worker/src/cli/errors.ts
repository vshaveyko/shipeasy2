// POST /cli/errors — opportunistic error telemetry from the shipeasy CLI.
// Auth is optional: if X-SDK-Key is a valid CLI/admin token we attribute the
// event to its project, otherwise we record it under "unknown". The endpoint
// is fire-and-forget (202) and never blocks the user-facing CLI.

import { validateSdkKey, type SdkKeyMeta } from "@shipeasy/core";
import type { Context } from "hono";
import type { WorkerEnv } from "../env";

type CliErrorContext = Context<{
  Bindings: WorkerEnv;
  Variables: { key: SdkKeyMeta };
}>;

interface CliErrorBody {
  kind?: string;
  command?: string | null;
  message?: string;
  argv?: string[];
  exit_code?: number | null;
  cli_version?: string;
  node_version?: string;
  platform?: string;
  ts?: number;
}

const MAX_BODY_BYTES = 8 * 1024;
const MAX_FIELD = 512;
const MAX_INDEX = 96;
const MAX_ARGV = 4 * 1024;

function clamp(v: unknown, max: number): string {
  if (v === undefined || v === null) return "";
  const s = typeof v === "string" ? v : String(v);
  return s.length > max ? s.slice(0, max) : s;
}

export async function handleCliError(c: CliErrorContext) {
  const raw = await c.req.text();
  if (raw.length > MAX_BODY_BYTES) return c.json({ error: "Body too large" }, 413);

  let body: CliErrorBody;
  try {
    body = JSON.parse(raw) as CliErrorBody;
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  if (!body.kind || !body.message) {
    return c.json({ error: "kind and message required" }, 400);
  }

  let projectId = "unknown";
  const sdkKey = c.req.header("X-SDK-Key");
  if (sdkKey && c.env.FLAGS_KV) {
    // CLI device-auth mints "admin" tokens — try that type first, fall back to
    // server/client so any valid project key gives us correct attribution.
    const meta =
      (await validateSdkKey(sdkKey, "admin", c.env.FLAGS_KV).catch(() => null)) ??
      (await validateSdkKey(sdkKey, "server", c.env.FLAGS_KV).catch(() => null)) ??
      (await validateSdkKey(sdkKey, "client", c.env.FLAGS_KV).catch(() => null));
    if (meta) projectId = meta.project_id;
  }

  const argv = Array.isArray(body.argv) ? body.argv.join(" ") : "";

  c.env.CLI_ERRORS?.writeDataPoint({
    indexes: [projectId, clamp(body.kind, MAX_INDEX)],
    blobs: [
      clamp(body.command, MAX_INDEX),
      clamp(body.message, MAX_FIELD),
      clamp(argv, MAX_ARGV),
      clamp(body.cli_version, 32),
      clamp(body.node_version, 32),
      clamp(body.platform, 64),
    ],
    doubles: [Number(body.ts ?? Date.now()), Number(body.exit_code ?? 0)],
  });

  return new Response(null, { status: 202 });
}
