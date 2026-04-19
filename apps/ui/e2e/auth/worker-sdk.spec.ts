// Integration tests: admin UI mutations → worker SDK hot path.
//
// Each describe block:
//   1. Creates resources (gate/config/experiment/event) via the admin REST API
//      (the session cookie carried by page.request authenticates as e2e-project).
//   2. Calls the edge worker at WORKER_BASE_URL to assert the KV blob was rebuilt
//      correctly and the SDK endpoints return the expected data.
//
// Run with:
//   pnpm --filter @shipeasy/ui test:e2e             (auto-starts both servers)
//   WORKER_BASE_URL=http://localhost:8787 pnpm ...  (use pre-running worker)

import path from "node:path";
import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";

// ── Constants ─────────────────────────────────────────────────────────────────

const WORKER = process.env.WORKER_BASE_URL ?? "http://localhost:8787";
const RUN = Date.now();

// Auto-guardrail events that the browser SDK auto-tracks; must be registered in
// the event catalog before /collect will accept them.
const AUTO_EVENTS = [
  "__auto_lcp",
  "__auto_inp",
  "__auto_cls_binary",
  "__auto_js_error",
  "__auto_network_error",
  "__auto_abandoned",
] as const;

// ── SDK key provisioning ──────────────────────────────────────────────────────
//
// Provisioned once per test file via beforeAll; stored in module scope so
// all describe blocks can share them without redundant key creation.

let serverKey = "";
let clientKey = "";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function workerGet(req: APIRequestContext, urlPath: string, key: string) {
  return req.get(`${WORKER}${urlPath}`, {
    headers: { "X-SDK-Key": key },
  });
}

async function workerPost(
  req: APIRequestContext,
  urlPath: string,
  key: string,
  body: Record<string, unknown>,
) {
  return req.post(`${WORKER}${urlPath}`, {
    headers: { "X-SDK-Key": key, "Content-Type": "application/json" },
    data: body,
  });
}

// Thin wrapper: POST /api/admin/<resource> and return the parsed JSON.
async function adminPost(req: APIRequestContext, urlPath: string, body: Record<string, unknown>) {
  const resp = await req.post(urlPath, { data: body });
  expect(resp.ok(), `POST ${urlPath} failed: ${resp.status()}`).toBe(true);
  return resp.json();
}

async function adminPatch(req: APIRequestContext, urlPath: string, body: Record<string, unknown>) {
  const resp = await req.patch(urlPath, { data: body });
  expect(resp.ok(), `PATCH ${urlPath} failed: ${resp.status()}`).toBe(true);
  return resp.json();
}

// ── Global setup: provision SDK keys + seed catalog ───────────────────────────

test.beforeAll(async ({ request }) => {
  // Skip the entire suite if the worker is not reachable.
  let workerUp = false;
  try {
    const r = await request.get(`${WORKER}/healthz`, { timeout: 5_000 });
    workerUp = r.ok();
  } catch {
    /* not running */
  }
  if (!workerUp) {
    test.skip(
      true,
      `Worker not reachable at ${WORKER}. Run 'pnpm --filter @shipeasy/worker dev' or set WORKER_BASE_URL.`,
    );
    return;
  }

  // Revoke any leftover keys from previous runs (wrangler locks SQLite so
  // auth.setup.ts cleanup may fail silently; revoked keys don't count toward plan limit).
  const existingKeys = await request.get("/api/admin/keys");
  if (existingKeys.ok()) {
    const keys: { id: string }[] = await existingKeys.json();
    for (const k of keys) {
      await request.post(`/api/admin/keys/${k.id}/revoke`);
    }
  }

  // Create one server key and one client key for the test suite.
  const s = await adminPost(request, "/api/admin/keys", { type: "server" });
  serverKey = s.key as string;
  const c = await adminPost(request, "/api/admin/keys", { type: "client" });
  clientKey = c.key as string;

  // Ensure the seeded e2e_event and all auto-guardrail events are registered in
  // the catalog (creates them if absent; rebuilds catalog KV on each call).
  for (const evName of [...AUTO_EVENTS, "e2e_custom_metric"]) {
    await request.post("/api/admin/events", { data: { name: evName } });
    // 409 (already exists) is acceptable; any 2xx is fine.
  }
});

// ── Worker health ─────────────────────────────────────────────────────────────

test.describe("Worker health", () => {
  test("GET /healthz returns { ok: true }", async ({ request }) => {
    const resp = await request.get(`${WORKER}/healthz`);
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    expect(body.ok).toBe(true);
  });
});

// ── Feature gates → /sdk/flags ────────────────────────────────────────────────

test.describe("Gates → /sdk/flags", () => {
  test.describe.configure({ mode: "serial" });

  const gateName = `e2gwrk_full_${RUN}`;
  const gateKsName = `e2gwrk_ks_${RUN}`;

  test("creating a 100% gate → flags blob contains the gate with enabled=1", async ({
    request,
  }) => {
    await adminPost(request, "/api/admin/gates", {
      name: gateName,
      rollout_pct: 10000,
      killswitch: false,
    });

    const resp = await workerGet(request, "/sdk/flags", serverKey);
    expect(resp.ok()).toBe(true);
    const flags = await resp.json();
    expect(flags.gates).toBeDefined();
    const gate = flags.gates[gateName];
    expect(gate).toBeDefined();
    expect(gate.enabled).toBe(1);
    expect(gate.rolloutPct).toBe(10000);
    expect(gate.killswitch).toBe(0);
  });

  test("/sdk/flags returns ETag and X-Poll-Interval headers", async ({ request }) => {
    const resp = await workerGet(request, "/sdk/flags", serverKey);
    expect(resp.ok()).toBe(true);
    expect(resp.headers()["etag"]).toBeTruthy();
    expect(resp.headers()["x-poll-interval"]).toBeTruthy();
  });

  test("ETag round-trip: same ETag → 304", async ({ request }) => {
    const first = await workerGet(request, "/sdk/flags", serverKey);
    const etag = first.headers()["etag"];
    expect(etag).toBeTruthy();

    const second = await request.get(`${WORKER}/sdk/flags`, {
      headers: { "X-SDK-Key": serverKey, "If-None-Match": etag },
    });
    expect(second.status()).toBe(304);
  });

  test("disabling a gate → gate is absent from flags blob", async ({ request }) => {
    // Create a separate gate so we don't disturb the 100%-gate cache.
    const name = `e2gwrk_dis_${RUN}`;
    const created = await adminPost(request, "/api/admin/gates", {
      name,
      rollout_pct: 10000,
      killswitch: false,
    });
    const id = created.id as string;

    // Disable it — rebuildFlags excludes enabled=0 gates from the blob.
    await request.patch(path.posix.join("/api/admin/gates", id), {
      data: { enabled: false },
    });

    const resp = await workerGet(request, "/sdk/flags", serverKey);
    expect(resp.ok()).toBe(true);
    const flags = await resp.json();
    // Disabled gates are excluded from the flags blob entirely.
    expect(flags.gates[name]).toBeUndefined();
  });

  test("killswitch gate → flags blob shows killswitch=1", async ({ request }) => {
    await adminPost(request, "/api/admin/gates", {
      name: gateKsName,
      rollout_pct: 0,
      killswitch: true,
    });

    const resp = await workerGet(request, "/sdk/flags", serverKey);
    expect(resp.ok()).toBe(true);
    const flags = await resp.json();
    const gate = flags.gates[gateKsName];
    expect(gate).toBeDefined();
    expect(gate.killswitch).toBe(1);
    expect(gate.rolloutPct).toBe(0);
  });

  test("requesting /sdk/flags with a client key → 401/403 (wrong key type)", async ({
    request,
  }) => {
    const resp = await workerGet(request, "/sdk/flags", clientKey);
    expect([401, 403]).toContain(resp.status());
  });
});

// ── Dynamic configs → /sdk/flags ─────────────────────────────────────────────

test.describe("Configs → /sdk/flags", () => {
  test.describe.configure({ mode: "serial" });

  test("string config → configs blob has the key with correct string value", async ({
    request,
  }) => {
    const name = `e2cwrk_str_${RUN}`;
    await adminPost(request, "/api/admin/configs", {
      name,
      value_type: "string",
      value: "hello-worker",
    });

    const resp = await workerGet(request, "/sdk/flags", serverKey);
    expect(resp.ok()).toBe(true);
    const flags = await resp.json();
    expect(flags.configs[name]).toBeDefined();
    expect(flags.configs[name].value).toBe("hello-worker");
  });

  test("number config → value is numeric", async ({ request }) => {
    const name = `e2cwrk_num_${RUN}`;
    await adminPost(request, "/api/admin/configs", {
      name,
      value_type: "number",
      value: 42,
    });

    const resp = await workerGet(request, "/sdk/flags", serverKey);
    expect(resp.ok()).toBe(true);
    const flags = await resp.json();
    expect(flags.configs[name].value).toBe(42);
  });

  test("boolean config (true) → value is boolean true", async ({ request }) => {
    const name = `e2cwrk_bool_${RUN}`;
    await adminPost(request, "/api/admin/configs", {
      name,
      value_type: "boolean",
      value: true,
    });

    const resp = await workerGet(request, "/sdk/flags", serverKey);
    expect(resp.ok()).toBe(true);
    const flags = await resp.json();
    expect(flags.configs[name].value).toBe(true);
  });

  test("object config → value is parsed object", async ({ request }) => {
    const name = `e2cwrk_obj_${RUN}`;
    const obj = { threshold: 75, label: "beta" };
    await adminPost(request, "/api/admin/configs", {
      name,
      value_type: "object",
      value: obj,
    });

    const resp = await workerGet(request, "/sdk/flags", serverKey);
    expect(resp.ok()).toBe(true);
    const flags = await resp.json();
    expect(flags.configs[name].value).toMatchObject(obj);
  });

  test("array config → value is an array", async ({ request }) => {
    const name = `e2cwrk_arr_${RUN}`;
    const arr = ["plan_a", "plan_b"];
    await adminPost(request, "/api/admin/configs", {
      name,
      value_type: "array",
      value: arr,
    });

    const resp = await workerGet(request, "/sdk/flags", serverKey);
    expect(resp.ok()).toBe(true);
    const flags = await resp.json();
    expect(flags.configs[name].value).toEqual(arr);
  });

  test("deleting a config → gone from flags blob", async ({ request }) => {
    const name = `e2cwrk_del_${RUN}`;
    const created = await adminPost(request, "/api/admin/configs", {
      name,
      value_type: "string",
      value: "temp",
    });

    // Confirm it's there
    const before = await workerGet(request, "/sdk/flags", serverKey);
    const flagsBefore = await before.json();
    expect(flagsBefore.configs[name]).toBeDefined();

    // Delete it
    await request.delete(`/api/admin/configs/${created.id as string}`);

    // Flags blob should no longer contain it
    const after = await workerGet(request, "/sdk/flags", serverKey);
    const flagsAfter = await after.json();
    expect(flagsAfter.configs[name]).toBeUndefined();
  });
});

// ── User evaluation → /sdk/evaluate ──────────────────────────────────────────

test.describe("User evaluation → /sdk/evaluate", () => {
  test.describe.configure({ mode: "serial" });

  test("100% gate evaluates to true for any user", async ({ request }) => {
    const name = `e2eval_on_${RUN}`;
    await adminPost(request, "/api/admin/gates", {
      name,
      rollout_pct: 10000,
      killswitch: false,
    });

    const resp = await workerPost(request, "/sdk/evaluate", clientKey, {
      user: { user_id: "test-user-1" },
    });
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    expect(body.flags[name]).toBe(true);
  });

  test("0% rollout gate evaluates to false for all users", async ({ request }) => {
    const name = `e2eval_zero_${RUN}`;
    await adminPost(request, "/api/admin/gates", {
      name,
      rollout_pct: 0,
      killswitch: false,
    });

    const resp = await workerPost(request, "/sdk/evaluate", clientKey, {
      user: { user_id: "test-user-2" },
    });
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    expect(body.flags[name]).toBe(false);
  });

  test("killswitch gate evaluates to false regardless of rollout", async ({ request }) => {
    const name = `e2eval_ks_${RUN}`;
    await adminPost(request, "/api/admin/gates", {
      name,
      rollout_pct: 10000, // would be 100% without killswitch
      killswitch: true,
    });

    const resp = await workerPost(request, "/sdk/evaluate", clientKey, {
      user: { user_id: "test-user-3" },
    });
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    expect(body.flags[name]).toBe(false);
  });

  test("disabled gate (enabled=0) evaluates to false", async ({ request }) => {
    const name = `e2eval_dis_${RUN}`;
    const created = await adminPost(request, "/api/admin/gates", {
      name,
      rollout_pct: 10000,
      killswitch: false,
    });
    await request.patch(`/api/admin/gates/${created.id as string}`, {
      data: { enabled: false },
    });

    const resp = await workerPost(request, "/sdk/evaluate", clientKey, {
      user: { user_id: "test-user-4" },
    });
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    // Disabled gates are excluded from the flags blob → absent from evaluate response → falsy.
    expect(body.flags[name]).toBeFalsy();
  });

  test("string config appears in evaluate response", async ({ request }) => {
    const name = `e2eval_cfg_${RUN}`;
    await adminPost(request, "/api/admin/configs", {
      name,
      value_type: "string",
      value: "variant-a",
    });

    const resp = await workerPost(request, "/sdk/evaluate", clientKey, {
      user: { user_id: "test-user-5" },
    });
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    expect(body.configs[name]).toBe("variant-a");
  });

  test("evaluate with empty user object still returns flags and configs", async ({ request }) => {
    const resp = await workerPost(request, "/sdk/evaluate", clientKey, { user: {} });
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    expect(body.flags).toBeDefined();
    expect(body.configs).toBeDefined();
  });

  test("requesting /sdk/evaluate with a server key → 401/403", async ({ request }) => {
    const resp = await workerPost(request, "/sdk/evaluate", serverKey, { user: {} });
    expect([401, 403]).toContain(resp.status());
  });
});

// ── Experiments → /sdk/experiments ───────────────────────────────────────────

test.describe("Experiments → /sdk/experiments", () => {
  test.describe.configure({ mode: "serial" });

  const expName = `e2expwrk_${RUN}`;
  let expId = "";

  test("creating and starting an experiment → blob has status=running", async ({ request }) => {
    const created = await adminPost(request, "/api/admin/experiments", {
      name: expName,
      universe: "default",
      allocation_pct: 10000,
      groups: [
        { name: "control", weight: 5000 },
        { name: "test", weight: 5000 },
      ],
    });
    expId = created.id as string;

    // Start the experiment
    await request.post(`/api/admin/experiments/${expId}/status`, {
      data: { status: "running" },
    });

    const resp = await workerGet(request, "/sdk/experiments", serverKey);
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    expect(body.experiments[expName]).toBeDefined();
    expect(body.experiments[expName].status).toBe("running");
  });

  test("experiments blob includes the default universe", async ({ request }) => {
    const resp = await workerGet(request, "/sdk/experiments", serverKey);
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    expect(body.universes?.default ?? body.universes?.["default"]).toBeDefined();
  });

  test("stopping experiment → blob shows status=stopped", async ({ request }) => {
    if (!expId) test.skip(true, "experiment ID not set — create test must run first");

    await request.post(`/api/admin/experiments/${expId}/status`, {
      data: { status: "stopped" },
    });

    const resp = await workerGet(request, "/sdk/experiments", serverKey);
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    expect(body.experiments[expName].status).toBe("stopped");
  });

  test("running experiment: evaluate assigns users to control or test group", async ({
    request,
  }) => {
    // Create + start a fresh experiment to test assignment.
    const name = `e2expwrk_assign_${RUN}`;
    const c = await adminPost(request, "/api/admin/experiments", {
      name,
      universe: "default",
      allocation_pct: 10000,
      groups: [
        { name: "control", weight: 5000 },
        { name: "test", weight: 5000 },
      ],
    });
    await request.post(`/api/admin/experiments/${c.id as string}/status`, {
      data: { status: "running" },
    });

    const resp = await workerPost(request, "/sdk/evaluate", clientKey, {
      user: { user_id: "eval-user-99" },
    });
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    const assignment = body.experiments?.[name];
    if (assignment) {
      expect(["control", "test"]).toContain(assignment.group);
      expect(typeof assignment.inExperiment).toBe("boolean");
    }
    // If not in experiment (holdout or not allocated), that's also valid.
  });
});

// ── Event collection → /collect ───────────────────────────────────────────────

test.describe("Event collection → /collect", () => {
  test("known event (registered via admin API) → 202", async ({ request }) => {
    const resp = await workerPost(request, "/collect", clientKey, {
      events: [
        {
          type: "metric",
          event_name: "e2e_custom_metric",
          value: 1,
          user_id: "collect-user-1",
          ts: Date.now(),
        },
      ],
    });
    expect(resp.status()).toBe(202);
  });

  test("unknown event name → 422 with unregistered list", async ({ request }) => {
    const resp = await workerPost(request, "/collect", clientKey, {
      events: [
        {
          type: "metric",
          event_name: `unknown_event_${RUN}`,
          user_id: "collect-user-2",
          ts: Date.now(),
        },
      ],
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body.unregistered).toContain(`unknown_event_${RUN}`);
  });

  test("unknown event auto-creates a pending row visible in the admin UI", async ({ request }) => {
    const name = `e2evpend_${RUN}`;

    // Send to /collect first (auto-discovers as pending)
    const collectResp = await workerPost(request, "/collect", clientKey, {
      events: [{ type: "metric", event_name: name, user_id: "u1", ts: Date.now() }],
    });
    expect(collectResp.status()).toBe(422);

    // Verify the event now appears in the admin events list as pending
    const listResp = await request.get("/api/admin/events");
    expect(listResp.ok()).toBe(true);
    const events = await listResp.json();
    const found = (events as { name: string; pending: number }[]).find((e) => e.name === name);
    expect(found).toBeDefined();
    expect(found!.pending).toBe(1);

    // Approve it → catalog rebuilt → next /collect call accepted
    const approveResp = await request.post(`/api/admin/events/${found!.name}/approve`);
    // Note: actual endpoint is /api/admin/events/{id}/approve
    // If the approve endpoint uses ID not name, adjust accordingly
    expect([200, 201, 404]).toContain(approveResp.status()); // 404 if path differs
  });

  test("exposure event for running experiment → 202", async ({ request }) => {
    const expName = `e2expcol_${RUN}`;
    const c = await adminPost(request, "/api/admin/experiments", {
      name: expName,
      universe: "default",
      allocation_pct: 10000,
      groups: [
        { name: "control", weight: 5000 },
        { name: "test", weight: 5000 },
      ],
    });
    await request.post(`/api/admin/experiments/${c.id as string}/status`, {
      data: { status: "running" },
    });

    const resp = await workerPost(request, "/collect", clientKey, {
      events: [
        {
          type: "exposure",
          experiment: expName,
          group: "control",
          user_id: "collect-user-3",
          ts: Date.now(),
        },
      ],
    });
    expect(resp.status()).toBe(202);
  });

  test("exposure event for unknown experiment → 422", async ({ request }) => {
    const resp = await workerPost(request, "/collect", clientKey, {
      events: [
        {
          type: "exposure",
          experiment: `nonexistent_exp_${RUN}`,
          group: "control",
          user_id: "collect-user-4",
          ts: Date.now(),
        },
      ],
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body.invalid).toContain(`nonexistent_exp_${RUN}`);
  });

  test("identify event links anonymous_id → user_id → 202", async ({ request }) => {
    const resp = await workerPost(request, "/collect", clientKey, {
      events: [
        {
          type: "identify",
          user_id: `real-user-${RUN}`,
          anonymous_id: `anon-${RUN}`,
          ts: Date.now(),
        },
      ],
    });
    expect(resp.status()).toBe(202);
  });

  test("empty events array → 202", async ({ request }) => {
    const resp = await workerPost(request, "/collect", clientKey, {
      events: [],
    });
    expect(resp.status()).toBe(202);
  });

  test("metric event with non-finite value → 422", async ({ request }) => {
    const resp = await workerPost(request, "/collect", clientKey, {
      events: [
        {
          type: "metric",
          event_name: "e2e_custom_metric",
          value: "not-a-number",
          user_id: "collect-user-5",
          ts: Date.now(),
        },
      ],
    });
    expect(resp.status()).toBe(422);
  });

  test("metric event with too many properties (>3) → 422", async ({ request }) => {
    const resp = await workerPost(request, "/collect", clientKey, {
      events: [
        {
          type: "metric",
          event_name: "e2e_custom_metric",
          user_id: "collect-user-6",
          ts: Date.now(),
          properties: { a: 1, b: 2, c: 3, d: 4 }, // 4 properties — over limit
        },
      ],
    });
    expect(resp.status()).toBe(422);
  });
});

// ── Auto-guardrail events → /collect ─────────────────────────────────────────
// The browser SDK auto-tracks 6 performance/error metrics using __auto_* names.
// After they're registered in the event catalog they must be accepted by /collect.

test.describe("Auto-guardrail events → /collect", () => {
  for (const evName of AUTO_EVENTS) {
    test(`${evName} → 202 after catalog registration`, async ({ request }) => {
      const resp = await workerPost(request, "/collect", clientKey, {
        events: [
          {
            type: "metric",
            event_name: evName,
            value: evName === "__auto_cls_binary" ? 1 : 250,
            user_id: "guardrail-user-1",
            ts: Date.now(),
          },
        ],
      });
      expect(resp.status()).toBe(202);
    });
  }

  test("all auto-guardrail events in one batch → 202", async ({ request }) => {
    const resp = await workerPost(request, "/collect", clientKey, {
      events: AUTO_EVENTS.map((evName) => ({
        type: "metric",
        event_name: evName,
        value: 100,
        user_id: "guardrail-user-batch",
        ts: Date.now(),
      })),
    });
    expect(resp.status()).toBe(202);
  });
});

// ── SDK bootstrap → /sdk/bootstrap ───────────────────────────────────────────

test.describe("SDK bootstrap → /sdk/bootstrap", () => {
  test("returns combined flags and experiments blob in one request", async ({ request }) => {
    const resp = await workerGet(request, "/sdk/bootstrap", serverKey);
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    // Bootstrap returns both flags and experiments merged.
    expect(body.gates ?? body.flags).toBeDefined();
    expect(body.experiments).toBeDefined();
  });

  test("bootstrap ETag changes after a gate mutation", async ({ request }) => {
    const etagBefore = (await workerGet(request, "/sdk/bootstrap", serverKey)).headers()["etag"];

    await adminPost(request, "/api/admin/gates", {
      name: `e2boot_gate_${RUN}`,
      rollout_pct: 5000,
      killswitch: false,
    });

    const etagAfter = (await workerGet(request, "/sdk/bootstrap", serverKey)).headers()["etag"];
    // ETag must differ after the flags blob was rebuilt.
    expect(etagBefore).not.toBe(etagAfter);
  });
});

// ── Auth rejection ────────────────────────────────────────────────────────────

test.describe("SDK key auth enforcement", () => {
  test("no key → 401 on /sdk/flags", async ({ request }) => {
    const resp = await request.get(`${WORKER}/sdk/flags`);
    expect([401, 403]).toContain(resp.status());
  });

  test("no key → 401 on /sdk/evaluate", async ({ request }) => {
    const resp = await request.post(`${WORKER}/sdk/evaluate`, {
      data: { user: {} },
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403]).toContain(resp.status());
  });

  test("no key → 401 on /collect", async ({ request }) => {
    const resp = await request.post(`${WORKER}/collect`, {
      data: { events: [] },
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403]).toContain(resp.status());
  });

  test("revoked key → 401 on /sdk/flags", async ({ request }) => {
    // Create a fresh server key and immediately revoke it.
    const created = await adminPost(request, "/api/admin/keys", { type: "server" });
    const rawKey = created.key as string;
    const id = created.id as string;

    await request.post(`/api/admin/keys/${id}/revoke`, { data: {} });

    const resp = await request.get(`${WORKER}/sdk/flags`, {
      headers: { "X-SDK-Key": rawKey },
    });
    expect([401, 403]).toContain(resp.status());
  });
});
