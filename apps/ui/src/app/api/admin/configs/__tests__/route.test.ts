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
import { GET as GET_ONE, PATCH, DELETE } from "../[id]/route";

beforeEach(async () => {
  const env = createTestEnv();
  await seedProject(env);
  mockEnv.DB = env.DB;
  mockEnv.FLAGS_KV = env.FLAGS_KV;
});

async function createConfig(name = "cfg", value: unknown = "v") {
  const res = await POST(req("POST", "/api/admin/configs", { name, value }));
  expect(res.status).toBe(201);
  return res.json() as Promise<{ id: string; name: string }>;
}

describe("GET /admin/configs", () => {
  it("returns empty list initially", async () => {
    const res = await GET(req("GET", "/api/admin/configs"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("lists created configs", async () => {
    await createConfig("a");
    await createConfig("b");
    const body = (await (await GET(req("GET", "/api/admin/configs"))).json()) as { name: string }[];
    expect(body.map((c) => c.name).sort()).toEqual(["a", "b"]);
  });
});

describe("POST /admin/configs", () => {
  it("creates a config (201)", async () => {
    const res = await POST(req("POST", "/api/admin/configs", { name: "theme", value: "dark" }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; name: string };
    expect(body.name).toBe("theme");
  });

  it("returns 409 for duplicate name", async () => {
    await createConfig("dup");
    expect((await POST(req("POST", "/api/admin/configs", { name: "dup", value: 1 }))).status).toBe(
      409,
    );
  });

  it("returns 422 for missing name", async () => {
    expect((await POST(req("POST", "/api/admin/configs", { value: "x" }))).status).toBe(422);
  });

  it("writes per-env flags blobs to KV", async () => {
    await createConfig("kv_cfg", true);
    const kv = mockEnv.FLAGS_KV as unknown as MemoryKV;
    for (const envName of ["dev", "staging", "prod"] as const) {
      const blob = JSON.parse(kv.store.get(`${TEST_PROJECT_ID}:${envName}:flags`)!);
      expect(blob.configs).toHaveProperty("kv_cfg");
      expect(blob.configs.kv_cfg.value).toBe(true);
      expect(blob.env).toBe(envName);
    }
  });
});

describe("GET /admin/configs/:id", () => {
  it("returns the config", async () => {
    const { id } = await createConfig("single");
    const res = await GET_ONE(req("GET", `/api/admin/configs/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { name: string }).name).toBe("single");
  });

  it("returns 404 for unknown id", async () => {
    const res = await GET_ONE(req("GET", "/api/admin/configs/ghost"), {
      params: Promise.resolve({ id: "ghost" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /admin/configs/:id", () => {
  it("updates value across all envs by creating a new version", async () => {
    const { id } = await createConfig("patchable", "old");
    await PATCH(req("PATCH", `/api/admin/configs/${id}`, { value: "new" }), {
      params: Promise.resolve({ id }),
    });
    const row = (await (
      await GET_ONE(req("GET", `/api/admin/configs/${id}`), { params: Promise.resolve({ id }) })
    ).json()) as {
      values: Record<string, unknown>;
      envs: Record<string, { version: number }>;
    };
    expect(row.values.prod).toBe("new");
    expect(row.values.dev).toBe("new");
    expect(row.values.staging).toBe("new");
    expect(row.envs.prod.version).toBe(2);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await PATCH(req("PATCH", "/api/admin/configs/ghost", { value: 1 }), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("DELETE /admin/configs/:id", () => {
  it("deletes the config", async () => {
    const { id } = await createConfig("bye");
    expect(
      (await DELETE(req("DELETE", `/api/admin/configs/${id}`), { params: Promise.resolve({ id }) }))
        .status,
    ).toBe(200);
    const list = (await (await GET(req("GET", "/api/admin/configs"))).json()) as { id: string }[];
    expect(list.find((c) => c.id === id)).toBeUndefined();
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await DELETE(req("DELETE", "/api/admin/configs/ghost"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});
