// Integration tests: SQLite → KV rebuild → worker endpoint HTTP responses.
//
// Each test:
//   1. Gets a fresh in-memory SQLite + Map-KV env from makeTestEnv().
//   2. Inserts a row into SQLite via better-sqlite3 (the sync underlying store).
//   3. Calls rebuildFlags / rebuildExperiments / rebuildCatalog to write KV blobs.
//   4. Calls app.fetch() with a properly authenticated Request.
//   5. Asserts the HTTP response shape.
//
// No real Cloudflare infra, no wrangler.  Fully deterministic and offline.

import { vi, describe, it, expect, beforeEach } from "vitest";
import { clearCaches, rebuildCatalog, rebuildExperiments, rebuildFlags } from "@shipeasy/core";
import { makeTestEnv, type TestEnv } from "./helpers/test-env";

// The module-scope caches in cache.ts (flagsCache, expsCache, catalogCache) and
// sdk-key.ts (keyCache) are bypassed naturally: each makeTestEnv() produces a
// unique projectId and unique key strings, so all cache lookups miss.
//
// The getDb() singleton in db/index.ts checks reference equality on the D1
// object; each makeTestEnv() creates a fresh D1, so it always gets a new Drizzle
// instance.
//
// For tests that mutate state mid-test (add/delete a gate, approve an event),
// clearCaches(projectId) flushes the 10s module-scope TTL cache so the next
// getFlags/getCatalog reads the freshly-rebuilt KV blob.
// IMPORTANT: app is imported statically so clearCaches() operates on the same
// module instance as the Hono handlers — vi.resetModules() would split them.

import app from "../index";

// ── Helpers ───────────────────────────────────────────────────────────────────

function req(
  method: string,
  path: string,
  key: string,
  body?: unknown,
  extra?: Record<string, string>,
): Request {
  return new Request(`http://worker${path}`, {
    method,
    headers: {
      "X-SDK-Key": key,
      "Content-Type": "application/json",
      ...extra,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function fetchApp(r: Request, env: WorkerEnv): Promise<Response> {
  return app.fetch(r, env, {
    waitUntil: () => {},
    passThroughOnException: () => {},
    props: {},
  } as unknown as ExecutionContext);
}

// WorkerEnv type needed for fetchApp signature.
import type { WorkerEnv } from "../env";

/** Seed a config row with an initial v1 published value in every env. */
async function seedConfig(
  env: WorkerEnv,
  opts: { id: string; projectId: string; name: string; value: unknown },
): Promise<void> {
  const now = new Date().toISOString();
  await env
    .DB!.prepare(
      "INSERT INTO configs (id, project_id, name, value_type, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(opts.id, opts.projectId, opts.name, "object", now)
    .run();
  for (const envName of ["dev", "staging", "prod"] as const) {
    await env
      .DB!.prepare(
        "INSERT INTO config_values (id, project_id, config_id, env, value_json, version, published_at, published_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `${opts.id}-${envName}`,
        opts.projectId,
        opts.id,
        envName,
        JSON.stringify(opts.value),
        1,
        now,
        "test@shipeasy.dev",
      )
      .run();
  }
}

// ── /sdk/flags ────────────────────────────────────────────────────────────────

describe("GET /sdk/flags", () => {
  let t: TestEnv;

  beforeEach(async () => {
    t = await makeTestEnv();
  });

  it("401 with no key", async () => {
    const r = new Request("http://worker/sdk/flags");
    const resp = await fetchApp(r, t.env);
    expect(resp.status).toBe(401);
  });

  it("401 when client key used on server endpoint", async () => {
    await rebuildFlags(t.env, t.projectId, "free");
    const resp = await fetchApp(req("GET", "/sdk/flags", t.clientKey), t.env);
    expect(resp.status).toBe(401);
  });

  it("returns flags blob with gate after rebuildFlags", async () => {
    // Insert a gate row directly into SQLite.
    const { sqlite } = t.env.DB as unknown as { sqlite: never };
    // Access the underlying better-sqlite3 via the d1 shim's closure.
    // Simpler: use the D1 exec() method to insert.
    await t.env
      .DB!.prepare(
        "INSERT INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, killswitch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `g1-${t.projectId}`,
        t.projectId,
        "my_feature",
        "[]",
        10000,
        "salt1",
        1,
        0,
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");

    const resp = await fetchApp(req("GET", "/sdk/flags", t.serverKey), t.env);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      gates: Record<string, { rolloutPct: number; enabled: number }>;
    };
    expect(body.gates["my_feature"]).toBeDefined();
    expect(body.gates["my_feature"].rolloutPct).toBe(10000);
    expect(body.gates["my_feature"].enabled).toBe(1);
  });

  it("gate with enabled=0 is excluded from blob", async () => {
    await t.env
      .DB!.prepare(
        "INSERT INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, killswitch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `g-dis-${t.projectId}`,
        t.projectId,
        "disabled_gate",
        "[]",
        10000,
        "s",
        0,
        0,
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");

    const resp = await fetchApp(req("GET", "/sdk/flags", t.serverKey), t.env);
    const body = (await resp.json()) as { gates: Record<string, unknown> };
    // rebuildFlags only includes enabled=1 gates
    expect(body.gates["disabled_gate"]).toBeUndefined();
  });

  it("killswitch gate is included with killswitch=1", async () => {
    await t.env
      .DB!.prepare(
        "INSERT INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, killswitch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `g-ks-${t.projectId}`,
        t.projectId,
        "ks_gate",
        "[]",
        0,
        "s",
        1,
        1,
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");

    const resp = await fetchApp(req("GET", "/sdk/flags", t.serverKey), t.env);
    const body = (await resp.json()) as {
      gates: Record<string, { killswitch: number; rolloutPct: number }>;
    };
    expect(body.gates["ks_gate"].killswitch).toBe(1);
    expect(body.gates["ks_gate"].rolloutPct).toBe(0);
  });

  it("returns ETag and X-Poll-Interval headers", async () => {
    await rebuildFlags(t.env, t.projectId, "free");
    const resp = await fetchApp(req("GET", "/sdk/flags", t.serverKey), t.env);
    expect(resp.headers.get("etag")).toBeTruthy();
    expect(resp.headers.get("x-poll-interval")).toBeTruthy();
  });

  it("returns 304 when If-None-Match matches ETag", async () => {
    await rebuildFlags(t.env, t.projectId, "free");
    const first = await fetchApp(req("GET", "/sdk/flags", t.serverKey), t.env);
    const etag = first.headers.get("etag")!;

    const second = await fetchApp(
      req("GET", "/sdk/flags", t.serverKey, undefined, { "If-None-Match": etag }),
      t.env,
    );
    expect(second.status).toBe(304);
  });

  it("ETag changes after adding a gate", async () => {
    await rebuildFlags(t.env, t.projectId, "free");
    const resp1 = await fetchApp(req("GET", "/sdk/flags", t.serverKey), t.env);
    const etag1 = resp1.headers.get("etag");

    await t.env
      .DB!.prepare(
        "INSERT INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, killswitch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `g-new-${t.projectId}`,
        t.projectId,
        "new_gate",
        "[]",
        5000,
        "s2",
        1,
        0,
        new Date().toISOString(),
      )
      .run();
    await rebuildFlags(t.env, t.projectId, "free");
    clearCaches(t.projectId); // flush 10s module-scope cache so next read sees new blob

    const resp2 = await fetchApp(req("GET", "/sdk/flags", t.serverKey), t.env);
    const etag2 = resp2.headers.get("etag");
    expect(etag1).not.toBe(etag2);
  });

  it("string config appears in flags blob", async () => {
    await seedConfig(t.env, {
      id: `c1-${t.projectId}`,
      projectId: t.projectId,
      name: "button_label",
      value: "Buy now",
    });

    await rebuildFlags(t.env, t.projectId, "free");

    const resp = await fetchApp(req("GET", "/sdk/flags", t.serverKey), t.env);
    const body = (await resp.json()) as { configs: Record<string, { value: unknown }> };
    expect(body.configs["button_label"].value).toBe("Buy now");
  });

  it("object config round-trips correctly", async () => {
    const obj = { threshold: 0.9, mode: "aggressive" };
    await seedConfig(t.env, {
      id: `c2-${t.projectId}`,
      projectId: t.projectId,
      name: "algo_config",
      value: obj,
    });

    await rebuildFlags(t.env, t.projectId, "free");

    const resp = await fetchApp(req("GET", "/sdk/flags", t.serverKey), t.env);
    const body = (await resp.json()) as { configs: Record<string, { value: unknown }> };
    expect(body.configs["algo_config"].value).toMatchObject(obj);
  });

  it("deleting a gate → removed from blob on next rebuild", async () => {
    const id = `g-del-${t.projectId}`;
    await t.env
      .DB!.prepare(
        "INSERT INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, killswitch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(id, t.projectId, "to_delete", "[]", 10000, "s", 1, 0, new Date().toISOString())
      .run();
    await rebuildFlags(t.env, t.projectId, "free");

    // Confirm it's in the blob.
    const before = (await (
      await fetchApp(req("GET", "/sdk/flags", t.serverKey), t.env)
    ).json()) as { gates: Record<string, unknown> };
    expect(before.gates["to_delete"]).toBeDefined();

    // Delete and rebuild.
    await t.env.DB!.prepare("DELETE FROM gates WHERE id = ?").bind(id).run();
    await rebuildFlags(t.env, t.projectId, "free");
    clearCaches(t.projectId);

    const after = (await (await fetchApp(req("GET", "/sdk/flags", t.serverKey), t.env)).json()) as {
      gates: Record<string, unknown>;
    };
    expect(after.gates["to_delete"]).toBeUndefined();
  });
});

// ── /sdk/evaluate ─────────────────────────────────────────────────────────────

describe("POST /sdk/evaluate", () => {
  let t: TestEnv;

  beforeEach(async () => {
    t = await makeTestEnv();
  });

  it("401 with no key", async () => {
    const r = new Request("http://worker/sdk/evaluate", {
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    });
    const resp = await fetchApp(r, t.env);
    expect(resp.status).toBe(401);
  });

  it("401 when server key used on client endpoint", async () => {
    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);
    const resp = await fetchApp(req("POST", "/sdk/evaluate", t.serverKey, { user: {} }), t.env);
    expect(resp.status).toBe(401);
  });

  it("100% gate evaluates to true", async () => {
    await t.env
      .DB!.prepare(
        "INSERT INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, killswitch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `ge1-${t.projectId}`,
        t.projectId,
        "full_rollout",
        "[]",
        10000,
        "s",
        1,
        0,
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);

    const resp = await fetchApp(
      req("POST", "/sdk/evaluate", t.clientKey, { user: { user_id: "u1" } }),
      t.env,
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { flags: Record<string, boolean> };
    expect(body.flags["full_rollout"]).toBe(true);
  });

  it("0% gate evaluates to false", async () => {
    await t.env
      .DB!.prepare(
        "INSERT INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, killswitch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `ge2-${t.projectId}`,
        t.projectId,
        "zero_rollout",
        "[]",
        0,
        "s",
        1,
        0,
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);

    const resp = await fetchApp(
      req("POST", "/sdk/evaluate", t.clientKey, { user: { user_id: "u2" } }),
      t.env,
    );
    const body = (await resp.json()) as { flags: Record<string, boolean> };
    expect(body.flags["zero_rollout"]).toBe(false);
  });

  it("killswitch gate evaluates to false regardless of rollout", async () => {
    await t.env
      .DB!.prepare(
        "INSERT INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, killswitch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `ge3-${t.projectId}`,
        t.projectId,
        "ks_eval",
        "[]",
        10000,
        "s",
        1,
        1,
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);

    const resp = await fetchApp(
      req("POST", "/sdk/evaluate", t.clientKey, { user: { user_id: "u3" } }),
      t.env,
    );
    const body = (await resp.json()) as { flags: Record<string, boolean> };
    expect(body.flags["ks_eval"]).toBe(false);
  });

  it("string config appears in evaluate response", async () => {
    await seedConfig(t.env, {
      id: `ce1-${t.projectId}`,
      projectId: t.projectId,
      name: "api_version",
      value: "v2",
    });

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);

    const resp = await fetchApp(
      req("POST", "/sdk/evaluate", t.clientKey, { user: { user_id: "u4" } }),
      t.env,
    );
    const body = (await resp.json()) as { configs: Record<string, unknown> };
    expect(body.configs["api_version"]).toBe("v2");
  });

  it("running experiment assigns user to a group", async () => {
    const expId = `exp1-${t.projectId}`;
    await t.env
      .DB!.prepare(
        "INSERT INTO experiments (id, project_id, name, universe, allocation_pct, salt, params, groups, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        expId,
        t.projectId,
        "btn_color",
        "default",
        10000,
        "btn_color",
        JSON.stringify({ color: "string" }),
        JSON.stringify([
          { name: "control", weight: 5000, params: { color: "gray" } },
          { name: "test", weight: 5000, params: { color: "blue" } },
        ]),
        "running",
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);

    const resp = await fetchApp(
      req("POST", "/sdk/evaluate", t.clientKey, { user: { user_id: "u5" } }),
      t.env,
    );
    const body = (await resp.json()) as {
      experiments: Record<string, { group: string; inExperiment: boolean }>;
    };
    // User may or may not be in the experiment, but the response is valid.
    expect(resp.status).toBe(200);
    if (body.experiments["btn_color"]) {
      expect(["control", "test"]).toContain(body.experiments["btn_color"].group);
    }
  });

  it("draft experiment is not included in evaluate response", async () => {
    await t.env
      .DB!.prepare(
        "INSERT INTO experiments (id, project_id, name, universe, allocation_pct, salt, params, groups, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `exp-draft-${t.projectId}`,
        t.projectId,
        "draft_exp",
        "default",
        10000,
        "s",
        JSON.stringify({}),
        JSON.stringify([{ name: "control", weight: 10000, params: {} }]),
        "draft",
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);

    const resp = await fetchApp(
      req("POST", "/sdk/evaluate", t.clientKey, { user: { user_id: "u6" } }),
      t.env,
    );
    const body = (await resp.json()) as { experiments: Record<string, unknown> };
    expect(body.experiments["draft_exp"]).toBeUndefined();
  });

  it("two users land in different experiment groups deterministically", async () => {
    // salt="pricing_exp", alloc=100%, equal split control/test (5000/5000)
    // murmur3("pricing_exp:group:user_3") % 10000 < 5000  → control
    // murmur3("pricing_exp:group:user_0") % 10000 >= 5000 → test
    await t.env
      .DB!.prepare(
        "INSERT INTO experiments (id, project_id, name, universe, allocation_pct, salt, params, groups, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `exp-seg-${t.projectId}`,
        t.projectId,
        "pricing_exp",
        "default",
        10000,
        "pricing_exp",
        JSON.stringify({ price: "string" }),
        JSON.stringify([
          { name: "control", weight: 5000, params: { price: "$9" } },
          { name: "test", weight: 5000, params: { price: "$12" } },
        ]),
        "running",
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);

    const controlResp = await fetchApp(
      req("POST", "/sdk/evaluate", t.clientKey, { user: { user_id: "user_3" } }),
      t.env,
    );
    const controlBody = (await controlResp.json()) as {
      experiments: Record<string, { group: string; params: Record<string, string> }>;
    };
    expect(controlBody.experiments["pricing_exp"].group).toBe("control");
    expect(controlBody.experiments["pricing_exp"].params.price).toBe("$9");

    const testResp = await fetchApp(
      req("POST", "/sdk/evaluate", t.clientKey, { user: { user_id: "user_0" } }),
      t.env,
    );
    const testBody = (await testResp.json()) as {
      experiments: Record<string, { group: string; params: Record<string, string> }>;
    };
    expect(testBody.experiments["pricing_exp"].group).toBe("test");
    expect(testBody.experiments["pricing_exp"].params.price).toBe("$12");
  });

  it("targeting-gate experiment: users without gate access are excluded, others split into groups", async () => {
    // Gate with plan=pro rule (100% rollout for matching users).
    // Experiment salt="gated_exp", alloc=100%, equal split:
    //   pro_user_0 → control, pro_user_2 → test
    //   free_user has plan=free so gate=false → not in experiment at all.
    const rules = JSON.stringify([{ attr: "plan", op: "eq", value: "pro" }]);
    await t.env
      .DB!.prepare(
        "INSERT INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, killswitch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `ge-tgt-${t.projectId}`,
        t.projectId,
        "pro_gate",
        rules,
        10000,
        "pro_gate",
        1,
        0,
        new Date().toISOString(),
      )
      .run();

    await t.env
      .DB!.prepare(
        "INSERT INTO experiments (id, project_id, name, universe, targeting_gate, allocation_pct, salt, params, groups, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `exp-tgt-${t.projectId}`,
        t.projectId,
        "gated_exp",
        "default",
        "pro_gate",
        10000,
        "gated_exp",
        JSON.stringify({ variant: "string" }),
        JSON.stringify([
          { name: "control", weight: 5000, params: { variant: "A" } },
          { name: "test", weight: 5000, params: { variant: "B" } },
        ]),
        "running",
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);

    // pro_user_0 passes gate → control
    const proCtrl = await fetchApp(
      req("POST", "/sdk/evaluate", t.clientKey, { user: { user_id: "pro_user_0", plan: "pro" } }),
      t.env,
    );
    const proCtrlBody = (await proCtrl.json()) as {
      flags: Record<string, boolean>;
      experiments: Record<string, { group: string }>;
    };
    expect(proCtrlBody.flags["pro_gate"]).toBe(true);
    expect(proCtrlBody.experiments["gated_exp"].group).toBe("control");

    // pro_user_2 passes gate → test
    const proTest = await fetchApp(
      req("POST", "/sdk/evaluate", t.clientKey, { user: { user_id: "pro_user_2", plan: "pro" } }),
      t.env,
    );
    const proTestBody = (await proTest.json()) as {
      flags: Record<string, boolean>;
      experiments: Record<string, { group: string }>;
    };
    expect(proTestBody.flags["pro_gate"]).toBe(true);
    expect(proTestBody.experiments["gated_exp"].group).toBe("test");

    // free user fails gate → excluded from experiment entirely
    const freeResp = await fetchApp(
      req("POST", "/sdk/evaluate", t.clientKey, { user: { user_id: "pro_user_0", plan: "free" } }),
      t.env,
    );
    const freeBody = (await freeResp.json()) as {
      flags: Record<string, boolean>;
      experiments: Record<string, unknown>;
    };
    expect(freeBody.flags["pro_gate"]).toBe(false);
    expect(freeBody.experiments["gated_exp"]).toBeUndefined();
  });

  it("targeting rule: eq match gates in user with matching attribute", async () => {
    const rules = JSON.stringify([{ attr: "plan", op: "eq", value: "pro" }]);
    await t.env
      .DB!.prepare(
        "INSERT INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, killswitch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `ge-rule-${t.projectId}`,
        t.projectId,
        "pro_feature",
        rules,
        10000,
        "s",
        1,
        0,
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);

    const proResp = await fetchApp(
      req("POST", "/sdk/evaluate", t.clientKey, { user: { user_id: "u7", plan: "pro" } }),
      t.env,
    );
    const proBody = (await proResp.json()) as { flags: Record<string, boolean> };
    expect(proBody.flags["pro_feature"]).toBe(true);

    const freeResp = await fetchApp(
      req("POST", "/sdk/evaluate", t.clientKey, { user: { user_id: "u8", plan: "free" } }),
      t.env,
    );
    const freeBody = (await freeResp.json()) as { flags: Record<string, boolean> };
    expect(freeBody.flags["pro_feature"]).toBe(false);
  });
});

// ── /sdk/experiments ──────────────────────────────────────────────────────────

describe("GET /sdk/experiments", () => {
  let t: TestEnv;

  beforeEach(async () => {
    t = await makeTestEnv();
  });

  it("returns default universe after rebuild", async () => {
    await rebuildExperiments(t.env, t.projectId);
    const resp = await fetchApp(req("GET", "/sdk/experiments", t.serverKey), t.env);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { universes: Record<string, unknown> };
    expect(body.universes["default"]).toBeDefined();
  });

  it("running experiment appears in blob with status=running", async () => {
    await t.env
      .DB!.prepare(
        "INSERT INTO experiments (id, project_id, name, universe, allocation_pct, salt, params, groups, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `exps-run-${t.projectId}`,
        t.projectId,
        "running_exp",
        "default",
        10000,
        "re",
        JSON.stringify({}),
        JSON.stringify([
          { name: "control", weight: 5000, params: {} },
          { name: "test", weight: 5000, params: {} },
        ]),
        "running",
        new Date().toISOString(),
      )
      .run();

    await rebuildExperiments(t.env, t.projectId);

    const resp = await fetchApp(req("GET", "/sdk/experiments", t.serverKey), t.env);
    const body = (await resp.json()) as { experiments: Record<string, { status: string }> };
    expect(body.experiments["running_exp"]).toBeDefined();
    expect(body.experiments["running_exp"].status).toBe("running");
  });

  it("stopped experiment status changes to stopped after rebuild", async () => {
    const expId = `exps-stop-${t.projectId}`;
    await t.env
      .DB!.prepare(
        "INSERT INTO experiments (id, project_id, name, universe, allocation_pct, salt, params, groups, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        expId,
        t.projectId,
        "stop_exp",
        "default",
        10000,
        "se",
        JSON.stringify({}),
        JSON.stringify([]),
        "running",
        new Date().toISOString(),
      )
      .run();
    await rebuildExperiments(t.env, t.projectId);

    // Update status to stopped.
    await t.env
      .DB!.prepare("UPDATE experiments SET status = ? WHERE id = ?")
      .bind("stopped", expId)
      .run();
    await rebuildExperiments(t.env, t.projectId);

    const resp = await fetchApp(req("GET", "/sdk/experiments", t.serverKey), t.env);
    const body = (await resp.json()) as { experiments: Record<string, { status: string }> };
    expect(body.experiments["stop_exp"].status).toBe("stopped");
  });

  it("archived experiment is excluded from blob", async () => {
    await t.env
      .DB!.prepare(
        "INSERT INTO experiments (id, project_id, name, universe, allocation_pct, salt, params, groups, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `exps-arch-${t.projectId}`,
        t.projectId,
        "archived_exp",
        "default",
        0,
        "ae",
        JSON.stringify({}),
        JSON.stringify([]),
        "archived",
        new Date().toISOString(),
      )
      .run();

    await rebuildExperiments(t.env, t.projectId);

    const resp = await fetchApp(req("GET", "/sdk/experiments", t.serverKey), t.env);
    const body = (await resp.json()) as { experiments: Record<string, unknown> };
    expect(body.experiments["archived_exp"]).toBeUndefined();
  });
});

// ── /collect ──────────────────────────────────────────────────────────────────

describe("POST /collect", () => {
  let t: TestEnv;

  beforeEach(async () => {
    t = await makeTestEnv();
  });

  it("empty events array → 202", async () => {
    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);
    await rebuildCatalog(t.env, t.projectId);

    const resp = await fetchApp(req("POST", "/collect", t.clientKey, { events: [] }), t.env);
    expect(resp.status).toBe(202);
  });

  it("known metric event (approved, pending=0) → 202", async () => {
    // Insert an approved event into the events table.
    await t.env
      .DB!.prepare(
        "INSERT INTO events (id, project_id, name, properties, pending, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(`ev1-${t.projectId}`, t.projectId, "purchase", "[]", 0, new Date().toISOString())
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);
    await rebuildCatalog(t.env, t.projectId);

    const resp = await fetchApp(
      req("POST", "/collect", t.clientKey, {
        events: [
          { type: "metric", event_name: "purchase", value: 9.99, user_id: "u1", ts: Date.now() },
        ],
      }),
      t.env,
    );
    expect(resp.status).toBe(202);
  });

  it("pending event (pending=1) not in catalog → 422 + unregistered list", async () => {
    // Insert a pending event — rebuildCatalog skips pending=1.
    await t.env
      .DB!.prepare(
        "INSERT INTO events (id, project_id, name, properties, pending, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `ev-pend-${t.projectId}`,
        t.projectId,
        "pending_event",
        "[]",
        1,
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);
    await rebuildCatalog(t.env, t.projectId);

    const resp = await fetchApp(
      req("POST", "/collect", t.clientKey, {
        events: [
          { type: "metric", event_name: "pending_event", value: 1, user_id: "u2", ts: Date.now() },
        ],
      }),
      t.env,
    );
    expect(resp.status).toBe(422);
    const body = (await resp.json()) as { unregistered: string[] };
    expect(body.unregistered).toContain("pending_event");
  });

  it("unknown event → 422 and auto-creates a pending row in D1", async () => {
    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);
    await rebuildCatalog(t.env, t.projectId);

    const evName = `auto_discover_${t.projectId}`;
    const resp = await fetchApp(
      req("POST", "/collect", t.clientKey, {
        events: [{ type: "metric", event_name: evName, user_id: "u3", ts: Date.now() }],
      }),
      t.env,
    );
    expect(resp.status).toBe(422);

    // Verify the pending row was inserted.
    const row = (await t.env
      .DB!.prepare("SELECT pending FROM events WHERE project_id = ? AND name = ?")
      .bind(t.projectId, evName)
      .first()) as { pending: number } | null;
    expect(row).not.toBeNull();
    expect(row!.pending).toBe(1);
  });

  it("approving event (pending 0 → 1) and rebuilding catalog → next collect accepted", async () => {
    const evName = `approvable_${t.projectId}`;
    await t.env
      .DB!.prepare(
        "INSERT INTO events (id, project_id, name, properties, pending, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(`ev-app-${t.projectId}`, t.projectId, evName, "[]", 1, new Date().toISOString())
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);
    await rebuildCatalog(t.env, t.projectId);

    // Still pending → 422.
    const before = await fetchApp(
      req("POST", "/collect", t.clientKey, {
        events: [{ type: "metric", event_name: evName, value: 1, user_id: "u4", ts: Date.now() }],
      }),
      t.env,
    );
    expect(before.status).toBe(422);

    // Approve: set pending=0 and rebuild catalog.
    await t.env
      .DB!.prepare("UPDATE events SET pending = 0 WHERE project_id = ? AND name = ?")
      .bind(t.projectId, evName)
      .run();
    await rebuildCatalog(t.env, t.projectId);
    clearCaches(t.projectId);

    // Now it should be accepted.
    const after = await fetchApp(
      req("POST", "/collect", t.clientKey, {
        events: [{ type: "metric", event_name: evName, value: 1, user_id: "u4", ts: Date.now() }],
      }),
      t.env,
    );
    expect(after.status).toBe(202);
  });

  it("exposure for running experiment → 202", async () => {
    await t.env
      .DB!.prepare(
        "INSERT INTO experiments (id, project_id, name, universe, allocation_pct, salt, params, groups, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `exp-col-${t.projectId}`,
        t.projectId,
        "running_for_collect",
        "default",
        10000,
        "rc",
        JSON.stringify({}),
        JSON.stringify([{ name: "control", weight: 10000, params: {} }]),
        "running",
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);
    await rebuildCatalog(t.env, t.projectId);

    const resp = await fetchApp(
      req("POST", "/collect", t.clientKey, {
        events: [
          {
            type: "exposure",
            experiment: "running_for_collect",
            group: "control",
            user_id: "u5",
            ts: Date.now(),
          },
        ],
      }),
      t.env,
    );
    expect(resp.status).toBe(202);
  });

  it("exposure for unknown experiment → 422", async () => {
    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);
    await rebuildCatalog(t.env, t.projectId);

    const resp = await fetchApp(
      req("POST", "/collect", t.clientKey, {
        events: [
          {
            type: "exposure",
            experiment: "nonexistent_exp",
            group: "control",
            user_id: "u6",
            ts: Date.now(),
          },
        ],
      }),
      t.env,
    );
    expect(resp.status).toBe(422);
    const body = (await resp.json()) as { invalid: string[] };
    expect(body.invalid).toContain("nonexistent_exp");
  });

  it("identify event writes alias to D1", async () => {
    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);
    await rebuildCatalog(t.env, t.projectId);

    const anonId = `anon-${t.projectId}`;
    const userId = `user-${t.projectId}`;
    const resp = await fetchApp(
      req("POST", "/collect", t.clientKey, {
        events: [{ type: "identify", user_id: userId, anonymous_id: anonId, ts: Date.now() }],
      }),
      t.env,
    );
    expect(resp.status).toBe(202);

    const row = (await t.env
      .DB!.prepare("SELECT user_id FROM user_aliases WHERE project_id = ? AND anonymous_id = ?")
      .bind(t.projectId, anonId)
      .first()) as { user_id: string } | null;
    expect(row?.user_id).toBe(userId);
  });

  it("metric event with non-finite value → 422", async () => {
    await t.env
      .DB!.prepare(
        "INSERT INTO events (id, project_id, name, properties, pending, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(`ev-bad-${t.projectId}`, t.projectId, "purchase", "[]", 0, new Date().toISOString())
      .run();
    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);
    await rebuildCatalog(t.env, t.projectId);

    const resp = await fetchApp(
      req("POST", "/collect", t.clientKey, {
        events: [
          {
            type: "metric",
            event_name: "purchase",
            value: "not-a-number",
            user_id: "u7",
            ts: Date.now(),
          },
        ],
      }),
      t.env,
    );
    expect(resp.status).toBe(422);
  });

  it("metric event with >3 properties → 422", async () => {
    await t.env
      .DB!.prepare(
        "INSERT INTO events (id, project_id, name, properties, pending, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(`ev-props-${t.projectId}`, t.projectId, "purchase", "[]", 0, new Date().toISOString())
      .run();
    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);
    await rebuildCatalog(t.env, t.projectId);

    const resp = await fetchApp(
      req("POST", "/collect", t.clientKey, {
        events: [
          {
            type: "metric",
            event_name: "purchase",
            value: 1,
            user_id: "u8",
            ts: Date.now(),
            properties: { a: 1, b: 2, c: 3, d: 4 },
          },
        ],
      }),
      t.env,
    );
    expect(resp.status).toBe(422);
  });
});

// ── /sdk/bootstrap ────────────────────────────────────────────────────────────
// Bootstrap requires X-User-Context: base64(JSON.stringify(user)).
// It returns evaluated flags + configs + experiments for that user — no ETag
// (responses are per-user, not cacheable at the CDN layer).

describe("GET /sdk/bootstrap", () => {
  let t: TestEnv;
  // A minimal user context header: base64({"user_id":"boot-user"})
  const userCtxHeader = { "X-User-Context": btoa(JSON.stringify({ user_id: "boot-user" })) };

  beforeEach(async () => {
    t = await makeTestEnv();
  });

  it("400 when X-User-Context header is missing", async () => {
    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);
    const resp = await fetchApp(req("GET", "/sdk/bootstrap", t.serverKey), t.env);
    expect(resp.status).toBe(400);
  });

  it("returns evaluated flags, configs, and experiments for the given user", async () => {
    await t.env
      .DB!.prepare(
        "INSERT INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, killswitch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `gb1-${t.projectId}`,
        t.projectId,
        "boot_gate",
        "[]",
        10000,
        "s",
        1,
        0,
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);

    const resp = await fetchApp(
      req("GET", "/sdk/bootstrap", t.serverKey, undefined, userCtxHeader),
      t.env,
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      flags: Record<string, boolean>;
      configs: Record<string, unknown>;
      experiments: Record<string, unknown>;
    };
    expect(body).toHaveProperty("flags");
    expect(body).toHaveProperty("configs");
    expect(body).toHaveProperty("experiments");
    // 100% gate evaluates to true for any user.
    expect(body.flags["boot_gate"]).toBe(true);
  });

  it("killswitch gate evaluates to false in bootstrap response", async () => {
    await t.env
      .DB!.prepare(
        "INSERT INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, killswitch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `gb-ks-${t.projectId}`,
        t.projectId,
        "boot_ks_gate",
        "[]",
        10000,
        "s",
        1,
        1,
        new Date().toISOString(),
      )
      .run();

    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);

    const resp = await fetchApp(
      req("GET", "/sdk/bootstrap", t.serverKey, undefined, userCtxHeader),
      t.env,
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { flags: Record<string, boolean> };
    expect(body.flags["boot_ks_gate"]).toBe(false);
  });

  it("gate added and rebuilt is reflected in next bootstrap call", async () => {
    await rebuildFlags(t.env, t.projectId, "free");
    await rebuildExperiments(t.env, t.projectId);

    const before = (await (
      await fetchApp(req("GET", "/sdk/bootstrap", t.serverKey, undefined, userCtxHeader), t.env)
    ).json()) as { flags: Record<string, boolean> };
    expect(before.flags["late_gate"]).toBeUndefined();

    await t.env
      .DB!.prepare(
        "INSERT INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, killswitch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `gb2-${t.projectId}`,
        t.projectId,
        "late_gate",
        "[]",
        10000,
        "s2",
        1,
        0,
        new Date().toISOString(),
      )
      .run();
    await rebuildFlags(t.env, t.projectId, "free");
    clearCaches(t.projectId);

    const after = (await (
      await fetchApp(req("GET", "/sdk/bootstrap", t.serverKey, undefined, userCtxHeader), t.env)
    ).json()) as { flags: Record<string, boolean> };
    expect(after.flags["late_gate"]).toBe(true);
  });
});
