import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_PROJECT_ID, TEST_EMAIL, createTestEnv, seedProject, req } from "@/test/helpers";
import { drizzle } from "drizzle-orm/d1";
import { events } from "@shipeasy/core/db/schema";

const mockEnv = vi.hoisted(() => ({
  DB: null as unknown as D1Database,
  FLAGS_KV: null as unknown as KVNamespace,
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: mockEnv }),
  initOpenNextCloudflareForDev: vi.fn(),
}));
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { email: TEST_EMAIL, project_id: TEST_PROJECT_ID } }),
}));

import { GET, POST } from "../route";
import { GET as GET_ONE, PATCH, DELETE } from "../[id]/route";

beforeEach(async () => {
  const env = createTestEnv();
  await seedProject(env);
  // seed an approved event that metrics can reference
  await drizzle(env.DB, {}).insert(events).values({
    id: "evt_test",
    projectId: TEST_PROJECT_ID,
    name: "purchase",
    description: "Purchase event",
    properties: [],
    pending: 0,
    createdAt: new Date().toISOString(),
  });
  mockEnv.DB = env.DB;
  mockEnv.FLAGS_KV = env.FLAGS_KV;
});

async function createMetric(name = "revenue", event_name = "purchase") {
  const res = await POST(
    req("POST", "/api/admin/metrics", { name, event_name, aggregation: "count_users" }),
  );
  expect(res.status).toBe(201);
  return res.json() as Promise<{ id: string; name: string }>;
}

describe("GET /admin/metrics", () => {
  it("returns empty list initially", async () => {
    expect(await (await GET(req("GET", "/api/admin/metrics"))).json()).toEqual([]);
  });

  it("lists created metrics", async () => {
    await createMetric("m1");
    await createMetric("m2");
    const body = (await (await GET(req("GET", "/api/admin/metrics"))).json()) as { name: string }[];
    expect(body.map((m) => m.name).sort()).toEqual(["m1", "m2"]);
  });
});

describe("POST /admin/metrics", () => {
  it("creates a metric (201)", async () => {
    const res = await POST(
      req("POST", "/api/admin/metrics", { name: "signups", event_name: "purchase" }),
    );
    expect(res.status).toBe(201);
    expect(((await res.json()) as { name: string }).name).toBe("signups");
  });

  it("returns 409 for duplicate name", async () => {
    await createMetric("dup");
    expect(
      (await POST(req("POST", "/api/admin/metrics", { name: "dup", event_name: "purchase" })))
        .status,
    ).toBe(409);
  });

  it("returns 422 if event not found", async () => {
    expect(
      (await POST(req("POST", "/api/admin/metrics", { name: "bad", event_name: "no_such_event" })))
        .status,
    ).toBe(422);
  });

  it("returns 422 for missing name", async () => {
    expect((await POST(req("POST", "/api/admin/metrics", { event_name: "purchase" }))).status).toBe(
      422,
    );
  });
});

describe("GET /admin/metrics/:id", () => {
  it("returns the metric", async () => {
    const { id } = await createMetric("single");
    const res = await GET_ONE(req("GET", `/api/admin/metrics/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { name: string }).name).toBe("single");
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await GET_ONE(req("GET", "/api/admin/metrics/ghost"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("PATCH /admin/metrics/:id", () => {
  it("updates aggregation", async () => {
    const { id } = await createMetric("patchable");
    expect(
      (
        await PATCH(req("PATCH", `/api/admin/metrics/${id}`, { aggregation: "sum" }), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await PATCH(req("PATCH", "/api/admin/metrics/ghost", { winsorize_pct: 95 }), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("DELETE /admin/metrics/:id", () => {
  it("deletes the metric", async () => {
    const { id } = await createMetric("bye");
    expect(
      (await DELETE(req("DELETE", `/api/admin/metrics/${id}`), { params: Promise.resolve({ id }) }))
        .status,
    ).toBe(200);
    expect(
      (await GET_ONE(req("GET", `/api/admin/metrics/${id}`), { params: Promise.resolve({ id }) }))
        .status,
    ).toBe(404);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await DELETE(req("DELETE", "/api/admin/metrics/ghost"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});
