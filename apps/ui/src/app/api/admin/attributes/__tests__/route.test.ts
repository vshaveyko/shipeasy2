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
import { GET as GET_ONE, PATCH, DELETE } from "../[id]/route";

beforeEach(async () => {
  const env = createTestEnv();
  await seedProject(env);
  mockEnv.DB = env.DB;
  mockEnv.FLAGS_KV = env.FLAGS_KV;
});

async function createAttribute(name = "country", type = "string") {
  const res = await POST(req("POST", "/api/admin/attributes", { name, type }));
  expect(res.status).toBe(201);
  return res.json() as Promise<{ id: string; name: string }>;
}

describe("GET /admin/attributes", () => {
  it("returns empty list initially", async () => {
    expect(await (await GET(req("GET", "/api/admin/attributes"))).json()).toEqual([]);
  });

  it("lists created attributes", async () => {
    await createAttribute("plan_type");
    await createAttribute("is_admin", "boolean");
    const body = (await (await GET(req("GET", "/api/admin/attributes"))).json()) as {
      name: string;
    }[];
    expect(body.map((a) => a.name).sort()).toEqual(["is_admin", "plan_type"]);
  });
});

describe("POST /admin/attributes", () => {
  it("creates an attribute (201)", async () => {
    const res = await POST(
      req("POST", "/api/admin/attributes", { name: "region", type: "string" }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { name: string };
    expect(body.name).toBe("region");
  });

  it("returns 409 for duplicate name", async () => {
    await createAttribute("dup");
    expect(
      (await POST(req("POST", "/api/admin/attributes", { name: "dup", type: "number" }))).status,
    ).toBe(409);
  });

  it("returns 422 for missing type", async () => {
    expect((await POST(req("POST", "/api/admin/attributes", { name: "bad" }))).status).toBe(422);
  });
});

describe("GET /admin/attributes/:id", () => {
  it("returns the attribute", async () => {
    const { id } = await createAttribute("single");
    const res = await GET_ONE(req("GET", `/api/admin/attributes/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { name: string }).name).toBe("single");
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await GET_ONE(req("GET", "/api/admin/attributes/ghost"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("PATCH /admin/attributes/:id", () => {
  it("updates description", async () => {
    const { id } = await createAttribute("patchable");
    const res = await PATCH(
      req("PATCH", `/api/admin/attributes/${id}`, { description: "Updated" }),
      {
        params: Promise.resolve({ id }),
      },
    );
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await PATCH(req("PATCH", "/api/admin/attributes/ghost", { description: "x" }), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("DELETE /admin/attributes/:id", () => {
  it("deletes the attribute", async () => {
    const { id } = await createAttribute("bye");
    expect(
      (
        await DELETE(req("DELETE", `/api/admin/attributes/${id}`), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await GET_ONE(req("GET", `/api/admin/attributes/${id}`), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(404);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await DELETE(req("DELETE", "/api/admin/attributes/ghost"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});
