// Post-deploy smoke tests for the production Cloudflare Worker.
//
// These run against the live URL (cdn.shipeasy.ai) using pre-provisioned SDK
// keys stored as CI secrets.  They are read-only: no admin mutations, no data
// creation.  The goal is to verify every public SDK endpoint responds with the
// right shape and HTTP contract after each deploy.
//
// Required env vars (skip suite if absent):
//   SMOKE_WORKER_URL   — e.g. https://cdn.shipeasy.ai
//   SMOKE_SERVER_KEY   — a live server SDK key for the smoke-test project
//   SMOKE_CLIENT_KEY   — a live client SDK key for the smoke-test project
//
// Run locally against a pre-running worker:
//   SMOKE_WORKER_URL=https://cdn.shipeasy.ai \
//   SMOKE_SERVER_KEY=sdk_server_... \
//   SMOKE_CLIENT_KEY=sdk_client_... \
//   pnpm --filter @shipeasy/ui exec playwright test e2e/smoke/worker.spec.ts \
//     --config playwright.smoke.config.ts

import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";

// ── Constants ─────────────────────────────────────────────────────────────────

const WORKER = process.env.SMOKE_WORKER_URL ?? "";
const SERVER_KEY = process.env.SMOKE_SERVER_KEY ?? "";
const CLIENT_KEY = process.env.SMOKE_CLIENT_KEY ?? "";

const SKIP_REASON =
  "Smoke env vars not set (SMOKE_WORKER_URL, SMOKE_SERVER_KEY, SMOKE_CLIENT_KEY). " +
  "These tests only run post-deploy.";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sdkGet(req: APIRequestContext, path: string, key: string, extra?: Record<string, string>) {
  return req.get(`${WORKER}${path}`, {
    headers: { "X-SDK-Key": key, ...extra },
  });
}

function sdkPost(req: APIRequestContext, path: string, key: string, body: unknown) {
  return req.post(`${WORKER}${path}`, {
    headers: { "X-SDK-Key": key, "Content-Type": "application/json" },
    data: body,
  });
}

// Skip every test in the file if the required env vars are absent.
test.beforeEach(() => {
  if (!WORKER || !SERVER_KEY || !CLIENT_KEY) {
    test.skip(true, SKIP_REASON);
  }
});

// ── Health ────────────────────────────────────────────────────────────────────

test.describe("Health", () => {
  test("GET / returns 200", async ({ request }) => {
    const resp = await request.get(WORKER);
    expect(resp.status()).toBe(200);
  });

  test("GET /healthz returns { ok: true }", async ({ request }) => {
    const resp = await request.get(`${WORKER}/healthz`);
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    expect(body.ok).toBe(true);
  });
});

// ── /sdk/flags ────────────────────────────────────────────────────────────────

test.describe("GET /sdk/flags", () => {
  test("200 with valid server key", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/flags", SERVER_KEY);
    expect(resp.ok()).toBe(true);
  });

  test("response has gates and configs objects", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/flags", SERVER_KEY);
    const body = await resp.json();
    expect(body).toHaveProperty("gates");
    expect(body).toHaveProperty("configs");
  });

  test("returns ETag header", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/flags", SERVER_KEY);
    expect(resp.headers()["etag"]).toBeTruthy();
  });

  test("returns X-Poll-Interval header", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/flags", SERVER_KEY);
    expect(resp.headers()["x-poll-interval"]).toBeTruthy();
  });

  test("returns 304 on matching If-None-Match", async ({ request }) => {
    const first = await sdkGet(request, "/sdk/flags", SERVER_KEY);
    const etag = first.headers()["etag"];
    expect(etag).toBeTruthy();

    const second = await sdkGet(request, "/sdk/flags", SERVER_KEY, { "If-None-Match": etag });
    expect(second.status()).toBe(304);
  });

  test("CORS: Access-Control-Allow-Origin present", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/flags", SERVER_KEY);
    expect(resp.headers()["access-control-allow-origin"]).toBeTruthy();
  });

  test("OPTIONS preflight returns 204 / 200", async ({ request }) => {
    const resp = await request.fetch(`${WORKER}/sdk/flags`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://example.com",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "X-SDK-Key",
      },
    });
    expect([200, 204]).toContain(resp.status());
  });

  test("401 with no key", async ({ request }) => {
    const resp = await request.get(`${WORKER}/sdk/flags`);
    expect([401, 403]).toContain(resp.status());
  });

  test("401 when using client key (wrong type)", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/flags", CLIENT_KEY);
    expect([401, 403]).toContain(resp.status());
  });
});

// ── /sdk/experiments ──────────────────────────────────────────────────────────

test.describe("GET /sdk/experiments", () => {
  test("200 with valid server key", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/experiments", SERVER_KEY);
    expect(resp.ok()).toBe(true);
  });

  test("response has experiments and universes objects", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/experiments", SERVER_KEY);
    const body = await resp.json();
    expect(body).toHaveProperty("experiments");
    expect(body).toHaveProperty("universes");
  });

  test("returns ETag header", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/experiments", SERVER_KEY);
    expect(resp.headers()["etag"]).toBeTruthy();
  });

  test("401 with no key", async ({ request }) => {
    const resp = await request.get(`${WORKER}/sdk/experiments`);
    expect([401, 403]).toContain(resp.status());
  });
});

// ── /sdk/evaluate ─────────────────────────────────────────────────────────────

test.describe("POST /sdk/evaluate", () => {
  test("200 with valid client key and user object", async ({ request }) => {
    const resp = await sdkPost(request, "/sdk/evaluate", CLIENT_KEY, {
      user: { user_id: "smoke-user-1" },
    });
    expect(resp.ok()).toBe(true);
  });

  test("response has flags, configs, experiments objects", async ({ request }) => {
    const resp = await sdkPost(request, "/sdk/evaluate", CLIENT_KEY, {
      user: { user_id: "smoke-user-2" },
    });
    const body = await resp.json();
    expect(body).toHaveProperty("flags");
    expect(body).toHaveProperty("configs");
    expect(body).toHaveProperty("experiments");
  });

  test("200 with empty user object", async ({ request }) => {
    const resp = await sdkPost(request, "/sdk/evaluate", CLIENT_KEY, { user: {} });
    expect(resp.ok()).toBe(true);
  });

  test("CORS: Access-Control-Allow-Origin present", async ({ request }) => {
    const resp = await sdkPost(request, "/sdk/evaluate", CLIENT_KEY, { user: {} });
    expect(resp.headers()["access-control-allow-origin"]).toBeTruthy();
  });

  test("401 with no key", async ({ request }) => {
    const resp = await request.post(`${WORKER}/sdk/evaluate`, {
      data: { user: {} },
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403]).toContain(resp.status());
  });

  test("401 when using server key (wrong type)", async ({ request }) => {
    const resp = await sdkPost(request, "/sdk/evaluate", SERVER_KEY, { user: {} });
    expect([401, 403]).toContain(resp.status());
  });
});

// ── /sdk/bootstrap ────────────────────────────────────────────────────────────

test.describe("GET /sdk/bootstrap", () => {
  test("200 with valid server key", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/bootstrap", SERVER_KEY);
    expect(resp.ok()).toBe(true);
  });

  test("response contains both flags and experiments blobs", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/bootstrap", SERVER_KEY);
    const body = await resp.json();
    // Bootstrap merges /sdk/flags and /sdk/experiments into one payload.
    expect(body.gates ?? body.flags).toBeDefined();
    expect(body).toHaveProperty("experiments");
  });

  test("returns ETag header", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/bootstrap", SERVER_KEY);
    expect(resp.headers()["etag"]).toBeTruthy();
  });

  test("304 on matching If-None-Match", async ({ request }) => {
    const first = await sdkGet(request, "/sdk/bootstrap", SERVER_KEY);
    const etag = first.headers()["etag"];

    const second = await sdkGet(request, "/sdk/bootstrap", SERVER_KEY, { "If-None-Match": etag });
    expect(second.status()).toBe(304);
  });

  test("401 with no key", async ({ request }) => {
    const resp = await request.get(`${WORKER}/sdk/bootstrap`);
    expect([401, 403]).toContain(resp.status());
  });
});

// ── /collect ──────────────────────────────────────────────────────────────────

test.describe("POST /collect", () => {
  test("202 with empty events array", async ({ request }) => {
    const resp = await sdkPost(request, "/collect", CLIENT_KEY, { events: [] });
    expect(resp.status()).toBe(202);
  });

  test("CORS: Access-Control-Allow-Origin present", async ({ request }) => {
    const resp = await sdkPost(request, "/collect", CLIENT_KEY, { events: [] });
    expect(resp.headers()["access-control-allow-origin"]).toBeTruthy();
  });

  test("401 with no key", async ({ request }) => {
    const resp = await request.post(`${WORKER}/collect`, {
      data: { events: [] },
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403]).toContain(resp.status());
  });

  test("401 when using server key (wrong type)", async ({ request }) => {
    const resp = await sdkPost(request, "/collect", SERVER_KEY, { events: [] });
    expect([401, 403]).toContain(resp.status());
  });

  test("identify event → 202", async ({ request }) => {
    const resp = await sdkPost(request, "/collect", CLIENT_KEY, {
      events: [
        {
          type: "identify",
          user_id: "smoke-identify-user",
          anonymous_id: "smoke-anon-id",
          ts: Date.now(),
        },
      ],
    });
    expect(resp.status()).toBe(202);
  });
});

// ── Response shape contract ───────────────────────────────────────────────────

test.describe("Flags blob shape contract", () => {
  test("/sdk/flags blob version field is present", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/flags", SERVER_KEY);
    const body = await resp.json();
    // version is a string like "v1" or a hash — must exist for client-side cache busting
    expect(body.version ?? body.plan).toBeDefined();
  });

  test("/sdk/experiments blob has default universe", async ({ request }) => {
    const resp = await sdkGet(request, "/sdk/experiments", SERVER_KEY);
    const body = await resp.json();
    // Every project always has a default universe
    expect(body.universes?.default).toBeDefined();
  });
});
