import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_PROJECT_ID, TEST_EMAIL, createTestEnv, seedProject, req } from "@/test/helpers";
import type { MemoryKV } from "@/test/memory-kv";

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
import { PATCH, DELETE } from "../[id]/route";
import { POST as ENABLE } from "../[id]/enable/route";
import { POST as DISABLE } from "../[id]/disable/route";

beforeEach(async () => {
  const env = createTestEnv();
  await seedProject(env);
  mockEnv.DB = env.DB;
  mockEnv.FLAGS_KV = env.FLAGS_KV;
});

async function createGate(name = "my_gate", rollout_pct = 100) {
  const res = await POST(req("POST", "/api/admin/gates", { name, rules: [], rollout_pct }));
  expect(res.status).toBe(201);
  return res.json() as Promise<{ id: string; name: string }>;
}

describe("GET /admin/gates", () => {
  it("returns empty list initially", async () => {
    const res = await GET(req("GET", "/api/admin/gates"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("lists all created gates", async () => {
    await createGate("gate_a");
    await createGate("gate_b");
    const body = (await (await GET(req("GET", "/api/admin/gates"))).json()) as { name: string }[];
    expect(body.map((g) => g.name).sort()).toEqual(["gate_a", "gate_b"]);
  });
});

describe("POST /admin/gates", () => {
  it("creates a gate (201)", async () => {
    const res = await POST(
      req("POST", "/api/admin/gates", { name: "beta", rules: [], rollout_pct: 50 }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; name: string };
    expect(body.name).toBe("beta");
    expect(body.id).toBeDefined();
  });

  it("returns 409 for duplicate name", async () => {
    await createGate("dup");
    const res = await POST(
      req("POST", "/api/admin/gates", { name: "dup", rules: [], rollout_pct: 0 }),
    );
    expect(res.status).toBe(409);
  });

  it("returns 422 for missing name", async () => {
    const res = await POST(req("POST", "/api/admin/gates", { rules: [], rollout_pct: 0 }));
    expect(res.status).toBe(422);
  });

  it("writes flags blob to KV", async () => {
    await createGate("kv_gate");
    const kv = mockEnv.FLAGS_KV as unknown as MemoryKV;
    const blob = JSON.parse(kv.store.get(`${TEST_PROJECT_ID}:prod:flags`)!);
    expect(blob.gates).toHaveProperty("kv_gate");
  });
});

describe("PATCH /admin/gates/:id", () => {
  it("updates rollout_pct", async () => {
    const { id } = await createGate("patchable");
    const res = await PATCH(req("PATCH", `/api/admin/gates/${id}`, { rollout_pct: 42 }), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    const list = (await (await GET(req("GET", "/api/admin/gates"))).json()) as {
      id: string;
      rolloutPct: number;
    }[];
    expect(list.find((g) => g.id === id)?.rolloutPct).toBe(42);
  });

  it("returns 404 for unknown id", async () => {
    const res = await PATCH(req("PATCH", "/api/admin/gates/no-such-id", { rollout_pct: 10 }), {
      params: Promise.resolve({ id: "no-such-id" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /admin/gates/:id", () => {
  it("deletes the gate", async () => {
    const { id } = await createGate("bye");
    const res = await DELETE(req("DELETE", `/api/admin/gates/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    const list = (await (await GET(req("GET", "/api/admin/gates"))).json()) as { id: string }[];
    expect(list.find((g) => g.id === id)).toBeUndefined();
  });

  it("returns 404 for unknown id", async () => {
    const res = await DELETE(req("DELETE", "/api/admin/gates/ghost"), {
      params: Promise.resolve({ id: "ghost" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /admin/gates/:id/enable|disable", () => {
  it("disables then re-enables a gate", async () => {
    const { id } = await createGate("toggle");
    const dis = await DISABLE(req("POST", `/api/admin/gates/${id}/disable`), {
      params: Promise.resolve({ id }),
    });
    expect(((await dis.json()) as { enabled: boolean }).enabled).toBe(false);
    const en = await ENABLE(req("POST", `/api/admin/gates/${id}/enable`), {
      params: Promise.resolve({ id }),
    });
    expect(((await en.json()) as { enabled: boolean }).enabled).toBe(true);
  });

  it("returns 404 for unknown id", async () => {
    const res = await ENABLE(req("POST", "/api/admin/gates/ghost/enable"), {
      params: Promise.resolve({ id: "ghost" }),
    });
    expect(res.status).toBe(404);
  });
});
