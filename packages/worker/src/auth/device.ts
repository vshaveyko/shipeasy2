// CLI device auth (PKCE). State machine:
//   POST /auth/device/start            → creates pending session
//   POST /auth/device/complete (svc)   → called by UI after user login; verifies PKCE
//   GET  /auth/device/poll             → CLI polls; verifies PKCE + returns token
//
// See experiment-platform/09-cli.md.

import { safeCompare, sha256, writeSdkKeyEntry } from "@shipeasy/core";
import { cliAuthSessions, sdkKeys } from "@shipeasy/core/db/schema";
import { and, eq } from "drizzle-orm";
import { getDb, type SdkKeyMeta } from "@shipeasy/core";
import type { Context } from "hono";
import type { WorkerEnv } from "../env";

type DeviceContext = Context<{ Bindings: WorkerEnv; Variables: { key: SdkKeyMeta } }>;

const SESSION_TTL_SECONDS = 600; // 10 minutes
const TOKEN_TTL_SECONDS = 300; // 5 minutes to poll after completion

function urlB64FromHex(hex: string): string {
  // Convert hex digest → base64url.
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function codeChallengeFromVerifier(verifier: string): Promise<string> {
  return urlB64FromHex(await sha256(verifier));
}

// POST /auth/device/start — CLI posts { code_challenge } (or the web relay does).
// Returns { state, expires_at }.
export async function deviceStart(c: DeviceContext) {
  const body = (await c.req.json().catch(() => ({}))) as { code_challenge?: string };
  const codeChallenge = body.code_challenge;
  if (!codeChallenge || codeChallenge.length < 16 || codeChallenge.length > 256) {
    return c.json({ error: "code_challenge required (base64url)" }, 400);
  }

  const state = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  const db = getDb(c.env.DB);
  await db.insert(cliAuthSessions).values({
    state,
    codeChallenge,
    projectId: null,
    tokenHash: null,
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    completedAt: null,
  });

  return c.json({ state, expires_at: expiresAt.toISOString() }, 201);
}

// POST /auth/device/complete — service-to-service from Next.js /cli-auth page.
// Headers: X-Service-Key: CLI_SERVICE_SECRET
// Body: { state, project_id, code_verifier, user_email }
// Server derives admin token, updates D1, parks raw token in CLI_TOKEN_KV for poll.
export async function deviceComplete(c: DeviceContext) {
  const svc = c.req.header("X-Service-Key");
  if (!c.env.CLI_SERVICE_SECRET || !svc || !safeCompare(svc, c.env.CLI_SERVICE_SECRET)) {
    return c.text("Forbidden", 403);
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    state?: string;
    project_id?: string;
    code_verifier?: string;
    user_email?: string;
  };
  if (!body.state || !body.project_id || !body.code_verifier || !body.user_email) {
    return c.json({ error: "state, project_id, code_verifier, user_email required" }, 400);
  }

  const db = getDb(c.env.DB);
  const [session] = await db
    .select()
    .from(cliAuthSessions)
    .where(eq(cliAuthSessions.state, body.state))
    .limit(1);

  if (!session) return c.text("Session not found", 404);
  if (session.status !== "pending") return c.text("Session already completed or expired", 409);
  if (new Date(session.expiresAt) < new Date()) {
    await db
      .update(cliAuthSessions)
      .set({ status: "expired" })
      .where(eq(cliAuthSessions.state, body.state));
    return c.text("Session expired", 410);
  }

  const expectedChallenge = await codeChallengeFromVerifier(body.code_verifier);
  if (!safeCompare(expectedChallenge, session.codeChallenge)) {
    return c.text("PKCE verification failed", 403);
  }

  const rawToken = `sdk_admin_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
  const tokenHash = await sha256(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 90 * 86_400_000).toISOString();

  await db.insert(sdkKeys).values({
    id: crypto.randomUUID(),
    projectId: body.project_id,
    keyHash: tokenHash,
    type: "admin",
    createdAt: now.toISOString(),
    revokedAt: null,
    expiresAt,
  });

  await writeSdkKeyEntry(c.env, tokenHash, {
    project_id: body.project_id,
    type: "admin",
    expires_at: expiresAt,
  });

  await db
    .update(cliAuthSessions)
    .set({
      projectId: body.project_id,
      tokenHash,
      status: "complete",
      completedAt: now.toISOString(),
    })
    .where(eq(cliAuthSessions.state, body.state));

  if (c.env.CLI_TOKEN_KV) {
    await c.env.CLI_TOKEN_KV.put(
      `cli_token:${body.state}`,
      JSON.stringify({ token: rawToken, project_id: body.project_id }),
      { expirationTtl: TOKEN_TTL_SECONDS },
    );
  }

  return c.json({ ok: true });
}

// GET /auth/device/poll?state=<state>  Header: X-Code-Verifier
export async function devicePoll(c: DeviceContext) {
  const state = c.req.query("state");
  const verifier = c.req.header("X-Code-Verifier");
  if (!state || !verifier) return c.json({ error: "state + X-Code-Verifier required" }, 400);

  const db = getDb(c.env.DB);
  const [session] = await db
    .select()
    .from(cliAuthSessions)
    .where(eq(cliAuthSessions.state, state))
    .limit(1);

  if (!session) return c.text("Session not found", 410);
  if (new Date(session.expiresAt) < new Date()) {
    await db
      .update(cliAuthSessions)
      .set({ status: "expired" })
      .where(and(eq(cliAuthSessions.state, state), eq(cliAuthSessions.status, "pending")));
    return c.text("Session expired", 410);
  }

  const expectedChallenge = await codeChallengeFromVerifier(verifier);
  if (!safeCompare(expectedChallenge, session.codeChallenge)) {
    return c.text("PKCE verification failed", 403);
  }

  if (session.status === "pending") return c.text("Pending", 202);
  if (session.status !== "complete" || !session.projectId) return c.text("Gone", 410);

  // Fetch raw token from KV (one-time retrieval).
  if (!c.env.CLI_TOKEN_KV) {
    return c.json({ error: "CLI_TOKEN_KV not bound" }, 500);
  }
  const payload = await c.env.CLI_TOKEN_KV.get(`cli_token:${state}`);
  if (!payload) return c.text("Token already retrieved or expired", 410);
  await c.env.CLI_TOKEN_KV.delete(`cli_token:${state}`);

  const parsed = JSON.parse(payload) as { token: string; project_id: string };
  return c.json({ token: parsed.token, project_id: parsed.project_id });
}
