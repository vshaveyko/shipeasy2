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

const PERMISSIVE_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: true,
};

beforeEach(async () => {
  const env = createTestEnv();
  // Paid plan — free caps configs at 1, but several tests need to create
  // multiple configs. Free-plan limits are exercised in dedicated tests
  // elsewhere.
  await seedProject(env, undefined, undefined, "paid");
  mockEnv.DB = env.DB;
  mockEnv.FLAGS_KV = env.FLAGS_KV;
});

async function createConfig(
  name = "cfg",
  value: unknown = { v: 1 },
  schema: Record<string, unknown> = PERMISSIVE_SCHEMA,
) {
  const res = await POST(req("POST", "/api/admin/configs", { name, schema, value }));
  expect(res.status).toBe(201);
  return res.json() as Promise<{ id: string; name: string }>;
}

describe("GET /admin/configs", () => {
  it("returns empty page initially", async () => {
    const res = await GET(req("GET", "/api/admin/configs"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [], next_cursor: null });
  });

  it("lists created configs with their schemas", async () => {
    await createConfig("a");
    await createConfig("b");
    const body = (
      (await (await GET(req("GET", "/api/admin/configs"))).json()) as {
        data: { name: string; schema: { type: string } }[];
      }
    ).data;
    expect(body.map((c) => c.name).sort()).toEqual(["a", "b"]);
    expect(body.every((c) => c.schema.type === "object")).toBe(true);
  });
});

describe("POST /admin/configs", () => {
  it("creates an object-typed config (201)", async () => {
    const res = await POST(
      req("POST", "/api/admin/configs", {
        name: "theme",
        schema: { type: "object", properties: { mode: { type: "string" } } },
        value: { mode: "dark" },
      }),
    );
    expect(res.status).toBe(201);
    expect(((await res.json()) as { name: string }).name).toBe("theme");
  });

  it("returns 409 for duplicate name", async () => {
    await createConfig("dup");
    const res = await POST(
      req("POST", "/api/admin/configs", { name: "dup", schema: PERMISSIVE_SCHEMA, value: {} }),
    );
    expect(res.status).toBe(409);
  });

  it("returns 422 for missing name", async () => {
    expect(
      (await POST(req("POST", "/api/admin/configs", { schema: PERMISSIVE_SCHEMA, value: {} })))
        .status,
    ).toBe(422);
  });

  it("returns 400 when value is not an object", async () => {
    const res = await POST(
      req("POST", "/api/admin/configs", {
        name: "bad",
        schema: PERMISSIVE_SCHEMA,
        value: "just a string",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when value violates the schema", async () => {
    const res = await POST(
      req("POST", "/api/admin/configs", {
        name: "strict",
        schema: {
          type: "object",
          properties: { count: { type: "number" } },
          required: ["count"],
        },
        value: {},
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 422 when schema is non-object (top-level type !== 'object')", async () => {
    const res = await POST(
      req("POST", "/api/admin/configs", {
        name: "arr",
        schema: { type: "array" },
        value: [],
      }),
    );
    expect(res.status).toBe(422);
  });

  it("writes per-env flags blobs to KV", async () => {
    await createConfig("kv_cfg", { enabled: true });
    const kv = mockEnv.FLAGS_KV as unknown as MemoryKV;
    for (const envName of ["dev", "staging", "prod"] as const) {
      const blob = JSON.parse(kv.store.get(`${TEST_PROJECT_ID}:${envName}:flags`)!);
      expect(blob.configs).toHaveProperty("kv_cfg");
      expect(blob.configs.kv_cfg.value).toEqual({ enabled: true });
      expect(blob.env).toBe(envName);
    }
  });
});

describe("GET /admin/configs/:id", () => {
  it("returns the config including its schema", async () => {
    const { id } = await createConfig(
      "single",
      { x: 1 },
      {
        type: "object",
        properties: { x: { type: "number" } },
      },
    );
    const res = await GET_ONE(req("GET", `/api/admin/configs/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; schema: { properties: object } };
    expect(body.name).toBe("single");
    expect(Object.keys(body.schema.properties)).toEqual(["x"]);
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
    const { id } = await createConfig("patchable", { v: "old" });
    await PATCH(req("PATCH", `/api/admin/configs/${id}`, { value: { v: "new" } }), {
      params: Promise.resolve({ id }),
    });
    const row = (await (
      await GET_ONE(req("GET", `/api/admin/configs/${id}`), { params: Promise.resolve({ id }) })
    ).json()) as {
      values: Record<string, unknown>;
      envs: Record<string, { version: number }>;
    };
    expect(row.values.prod).toEqual({ v: "new" });
    expect(row.values.dev).toEqual({ v: "new" });
    expect(row.values.staging).toEqual({ v: "new" });
    expect(row.envs.prod.version).toBe(2);
  });

  it("schema-only PATCH does NOT bump the value version", async () => {
    const { id } = await createConfig("schema_only", { v: 1 });
    const before = (await (
      await GET_ONE(req("GET", `/api/admin/configs/${id}`), { params: Promise.resolve({ id }) })
    ).json()) as { envs: Record<string, { version: number }> };
    expect(before.envs.prod.version).toBe(1);

    await PATCH(
      req("PATCH", `/api/admin/configs/${id}`, {
        schema: {
          type: "object",
          properties: { v: { type: "number" }, label: { type: "string" } },
        },
      }),
      { params: Promise.resolve({ id }) },
    );

    const after = (await (
      await GET_ONE(req("GET", `/api/admin/configs/${id}`), { params: Promise.resolve({ id }) })
    ).json()) as {
      schema: { properties: Record<string, unknown> };
      envs: Record<string, { version: number }>;
    };
    expect(after.envs.prod.version).toBe(1);
    expect(Object.keys(after.schema.properties).sort()).toEqual(["label", "v"]);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await PATCH(
          req("PATCH", "/api/admin/configs/ghost", {
            value: { v: 1 },
          }),
          { params: Promise.resolve({ id: "ghost" }) },
        )
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
    const list = (
      (await (await GET(req("GET", "/api/admin/configs"))).json()) as {
        data: { id: string }[];
      }
    ).data;
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
