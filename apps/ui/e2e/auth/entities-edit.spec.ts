import { expect, test, type APIRequestContext } from "@playwright/test";
import { adminList } from "../admin-list";
import { setProjectPlan } from "../seed-fixtures";

/**
 * Admin-API edit (PATCH) coverage for entities whose UI exposes
 * create + delete only:
 *   - metrics, universes, attributes, events
 *
 * These endpoints are the public surface used by the CLI, MCP server, and
 * the published Admin API. Edit coverage at the API level prevents
 * regressions in cross-runtime consumers even while the UI lacks edit forms.
 */

const RUN = Date.now();

test.beforeAll(() => setProjectPlan("paid"));
test.afterAll(() => setProjectPlan("free"));

async function findByName<T>(
  request: APIRequestContext,
  path: string,
  name: string,
): Promise<T | undefined> {
  const rows = await adminList<T & { name?: string }>(request, path);
  return rows.find((r) => r.name === name) as T | undefined;
}

// ── Metrics ────────────────────────────────────────────────────────────

test.describe("Metrics — admin API edit (PATCH)", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2m_edit_${RUN}`;
  let id = "";

  test.beforeAll(async ({ request }) => {
    const resp = await request.post("/api/admin/metrics", {
      data: { name, event_name: "e2e_event", aggregation: "count_users" },
    });
    expect(resp.ok(), `create failed: ${await resp.text()}`).toBe(true);
    const body = (await resp.json()) as { id: string };
    id = body.id;
  });

  test.afterAll(async ({ request }) => {
    if (id) await request.delete(`/api/admin/metrics/${id}`);
  });

  test("PATCH aggregation count_users → sum + value_path", async ({ request }) => {
    const resp = await request.patch(`/api/admin/metrics/${id}`, {
      data: { aggregation: "sum", value_path: "amount" },
    });
    expect(resp.ok()).toBe(true);
    const m = await findByName<{ id: string; aggregation: string; valuePath: string | null }>(
      request,
      "/api/admin/metrics",
      name,
    );
    expect(m?.aggregation).toBe("sum");
    expect(m?.valuePath).toBe("amount");
  });

  test("PATCH aggregation sum → avg keeps value_path", async ({ request }) => {
    const resp = await request.patch(`/api/admin/metrics/${id}`, {
      data: { aggregation: "avg" },
    });
    expect(resp.ok()).toBe(true);
    const m = await findByName<{ aggregation: string; valuePath: string | null }>(
      request,
      "/api/admin/metrics",
      name,
    );
    expect(m?.aggregation).toBe("avg");
    expect(m?.valuePath).toBe("amount");
  });

  test("PATCH winsorize_pct from default 99 → 95", async ({ request }) => {
    const resp = await request.patch(`/api/admin/metrics/${id}`, {
      data: { winsorize_pct: 95 },
    });
    expect(resp.ok()).toBe(true);
    const m = await findByName<{ winsorizePct: number }>(request, "/api/admin/metrics", name);
    expect(m?.winsorizePct).toBe(95);
  });

  test("PATCH min_detectable_effect 0.03", async ({ request }) => {
    const resp = await request.patch(`/api/admin/metrics/${id}`, {
      data: { min_detectable_effect: 0.03 },
    });
    expect(resp.ok()).toBe(true);
    const m = await findByName<{ minDetectableEffect: number | null }>(
      request,
      "/api/admin/metrics",
      name,
    );
    expect(m?.minDetectableEffect).toBe(0.03);
  });

  test("PATCH rejects winsorize_pct=0 (must be 1-99)", async ({ request }) => {
    const resp = await request.patch(`/api/admin/metrics/${id}`, {
      data: { winsorize_pct: 0 },
    });
    expect(resp.status()).toBeGreaterThanOrEqual(400);
    expect(resp.status()).toBeLessThan(500);
  });

  test("PATCH rejects invalid aggregation enum", async ({ request }) => {
    const resp = await request.patch(`/api/admin/metrics/${id}`, {
      data: { aggregation: "median" },
    });
    expect(resp.status()).toBeGreaterThanOrEqual(400);
    expect(resp.status()).toBeLessThan(500);
  });

  test("PATCH event_name to unregistered → 422", async ({ request }) => {
    const resp = await request.patch(`/api/admin/metrics/${id}`, {
      data: { event_name: `nonexistent_${RUN}` },
    });
    expect(resp.status()).toBe(422);
  });
});

// ── Universes ──────────────────────────────────────────────────────────

test.describe("Universes — admin API edit (PATCH)", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2u_edit_${RUN}`;
  let id = "";

  test.beforeAll(async ({ request }) => {
    const resp = await request.post("/api/admin/universes", {
      data: { name, unit_type: "user_id" },
    });
    expect(resp.ok(), `create failed: ${await resp.text()}`).toBe(true);
    const body = (await resp.json()) as { id: string };
    id = body.id;
  });

  test.afterAll(async ({ request }) => {
    if (id) await request.delete(`/api/admin/universes/${id}`);
  });

  test("PATCH adds holdout_range [0, 999]", async ({ request }) => {
    const resp = await request.patch(`/api/admin/universes/${id}`, {
      data: { holdout_range: [0, 999] },
    });
    expect(resp.ok(), await resp.text()).toBe(true);
    const u = await findByName<{ holdoutRange: [number, number] | null }>(
      request,
      "/api/admin/universes",
      name,
    );
    expect(u?.holdoutRange).toEqual([0, 999]);
  });

  test("PATCH clears holdout_range with null", async ({ request }) => {
    const resp = await request.patch(`/api/admin/universes/${id}`, {
      data: { holdout_range: null },
    });
    expect(resp.ok()).toBe(true);
    const u = await findByName<{ holdoutRange: [number, number] | null }>(
      request,
      "/api/admin/universes",
      name,
    );
    expect(u?.holdoutRange).toBeNull();
  });

  test("PATCH rejects inverted holdout_range (lo > hi)", async ({ request }) => {
    const resp = await request.patch(`/api/admin/universes/${id}`, {
      data: { holdout_range: [500, 100] },
    });
    expect(resp.status()).toBeGreaterThanOrEqual(400);
    expect(resp.status()).toBeLessThan(500);
  });

  test("PATCH rejects out-of-bounds holdout_range (>9999)", async ({ request }) => {
    const resp = await request.patch(`/api/admin/universes/${id}`, {
      data: { holdout_range: [0, 10000] },
    });
    expect(resp.status()).toBeGreaterThanOrEqual(400);
    expect(resp.status()).toBeLessThan(500);
  });
});

// ── Attributes ─────────────────────────────────────────────────────────

test.describe("Attributes — admin API edit (PATCH)", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2a_edit_${RUN}`;
  let id = "";

  test.beforeAll(async ({ request }) => {
    const resp = await request.post("/api/admin/attributes", {
      data: { name, type: "string" },
    });
    expect(resp.ok(), `create failed: ${await resp.text()}`).toBe(true);
    const body = (await resp.json()) as { id: string };
    id = body.id;
  });

  test.afterAll(async ({ request }) => {
    if (id) await request.delete(`/api/admin/attributes/${id}`);
  });

  test("PATCH type string → number", async ({ request }) => {
    const resp = await request.patch(`/api/admin/attributes/${id}`, {
      data: { type: "number" },
    });
    expect(resp.ok(), await resp.text()).toBe(true);
    const a = await findByName<{ type: string }>(request, "/api/admin/attributes", name);
    expect(a?.type).toBe("number");
  });

  test("PATCH type → enum and set enum_values", async ({ request }) => {
    const resp = await request.patch(`/api/admin/attributes/${id}`, {
      data: { type: "enum", enum_values: ["free", "pro", "ent"] },
    });
    expect(resp.ok()).toBe(true);
    const a = await findByName<{ type: string; enumValues: string[] | null }>(
      request,
      "/api/admin/attributes",
      name,
    );
    expect(a?.type).toBe("enum");
    expect(a?.enumValues).toEqual(["free", "pro", "ent"]);
  });

  test("PATCH required toggle true", async ({ request }) => {
    const resp = await request.patch(`/api/admin/attributes/${id}`, {
      data: { required: true },
    });
    expect(resp.ok()).toBe(true);
    const a = await findByName<{ required: boolean | number }>(
      request,
      "/api/admin/attributes",
      name,
    );
    expect(Boolean(a?.required)).toBe(true);
  });

  test("PATCH description + sdk_path", async ({ request }) => {
    const resp = await request.patch(`/api/admin/attributes/${id}`, {
      data: { description: "user tier", sdk_path: "user.plan" },
    });
    expect(resp.ok()).toBe(true);
    const a = await findByName<{ description: string; sdkPath: string }>(
      request,
      "/api/admin/attributes",
      name,
    );
    expect(a?.description).toBe("user tier");
    expect(a?.sdkPath).toBe("user.plan");
  });

  test("PATCH rejects invalid type enum", async ({ request }) => {
    const resp = await request.patch(`/api/admin/attributes/${id}`, {
      data: { type: "uuid" },
    });
    expect(resp.status()).toBeGreaterThanOrEqual(400);
    expect(resp.status()).toBeLessThan(500);
  });
});

// ── Events ─────────────────────────────────────────────────────────────

test.describe("Events — admin API edit (PATCH)", () => {
  test.describe.configure({ mode: "serial" });

  const name = `e2ev_edit_${RUN}`;
  let id = "";

  test.beforeAll(async ({ request }) => {
    const resp = await request.post("/api/admin/events", {
      data: { name, description: "initial" },
    });
    expect(resp.ok(), `create failed: ${await resp.text()}`).toBe(true);
    const body = (await resp.json()) as { id: string };
    id = body.id;
  });

  test.afterAll(async ({ request }) => {
    if (id) await request.delete(`/api/admin/events/${id}`);
  });

  test("PATCH description", async ({ request }) => {
    const resp = await request.patch(`/api/admin/events/${id}`, {
      data: { description: "updated description" },
    });
    expect(resp.ok(), await resp.text()).toBe(true);
    const e = await findByName<{ description: string }>(request, "/api/admin/events", name);
    expect(e?.description).toBe("updated description");
  });

  test("PATCH properties — add one property", async ({ request }) => {
    const resp = await request.patch(`/api/admin/events/${id}`, {
      data: {
        properties: [{ name: "amount", type: "number", required: true, description: "USD cents" }],
      },
    });
    expect(resp.ok()).toBe(true);
    const e = await findByName<{ properties: { name: string; type: string }[] }>(
      request,
      "/api/admin/events",
      name,
    );
    expect(e?.properties?.length ?? 0).toBe(1);
    expect(e?.properties?.[0]?.name).toBe("amount");
    expect(e?.properties?.[0]?.type).toBe("number");
  });

  test("PATCH properties — replace with empty array", async ({ request }) => {
    const resp = await request.patch(`/api/admin/events/${id}`, {
      data: { properties: [] },
    });
    expect(resp.ok()).toBe(true);
    const e = await findByName<{ properties: unknown[] }>(request, "/api/admin/events", name);
    expect(e?.properties).toEqual([]);
  });

  test("PATCH rejects invalid property type", async ({ request }) => {
    const resp = await request.patch(`/api/admin/events/${id}`, {
      data: {
        properties: [{ name: "x", type: "uuid", required: false, description: "" }],
      },
    });
    expect(resp.status()).toBeGreaterThanOrEqual(400);
    expect(resp.status()).toBeLessThan(500);
  });
});
