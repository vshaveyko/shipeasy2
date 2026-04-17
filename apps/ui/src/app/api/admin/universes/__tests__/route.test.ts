import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEST_PROJECT_ID, TEST_EMAIL, createTestEnv, seedProject, req } from "@/test/helpers";

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

beforeEach(async () => {
  const env = createTestEnv();
  await seedProject(env);
  mockEnv.DB = env.DB;
  mockEnv.FLAGS_KV = env.FLAGS_KV;
});

async function createUniverse(name = "main") {
  const res = await POST(req("POST", "/api/admin/universes", { name, unit_type: "user_id" }));
  expect(res.status).toBe(201);
  return res.json() as Promise<{ id: string; name: string }>;
}

describe("GET /admin/universes", () => {
  it("returns empty list initially", async () => {
    expect(await (await GET(req("GET", "/api/admin/universes"))).json()).toEqual([]);
  });

  it("lists created universes", async () => {
    await createUniverse("u1");
    await createUniverse("u2");
    const body = (await (await GET(req("GET", "/api/admin/universes"))).json()) as {
      name: string;
    }[];
    expect(body.map((u) => u.name).sort()).toEqual(["u1", "u2"]);
  });
});

describe("POST /admin/universes", () => {
  it("creates a universe (201)", async () => {
    const res = await POST(
      req("POST", "/api/admin/universes", { name: "devices", unit_type: "device_id" }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; name: string };
    expect(body.name).toBe("devices");
  });

  it("returns 409 for duplicate name", async () => {
    await createUniverse("dup");
    expect((await POST(req("POST", "/api/admin/universes", { name: "dup" }))).status).toBe(409);
  });

  it("returns 422 for missing name", async () => {
    expect((await POST(req("POST", "/api/admin/universes", { unit_type: "user_id" }))).status).toBe(
      422,
    );
  });
});

describe("PATCH /admin/universes/:id", () => {
  it("clears holdout_range (null is always allowed)", async () => {
    const { id } = await createUniverse("holdout-test");
    const res = await PATCH(req("PATCH", `/api/admin/universes/${id}`, { holdout_range: null }), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 403 setting holdout_range on free plan", async () => {
    const { id } = await createUniverse("holdout-gated");
    const res = await PATCH(
      req("PATCH", `/api/admin/universes/${id}`, { holdout_range: [0, 500] }),
      {
        params: Promise.resolve({ id }),
      },
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await PATCH(req("PATCH", "/api/admin/universes/ghost", { holdout_range: null }), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("DELETE /admin/universes/:id", () => {
  it("deletes the universe", async () => {
    const { id } = await createUniverse("bye");
    expect(
      (
        await DELETE(req("DELETE", `/api/admin/universes/${id}`), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(200);
    const list = (await (await GET(req("GET", "/api/admin/universes"))).json()) as { id: string }[];
    expect(list.find((u) => u.id === id)).toBeUndefined();
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await DELETE(req("DELETE", "/api/admin/universes/ghost"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});
