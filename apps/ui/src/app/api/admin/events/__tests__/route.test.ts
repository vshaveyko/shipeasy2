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
import { POST as APPROVE } from "../[id]/approve/route";

beforeEach(async () => {
  const env = createTestEnv();
  await seedProject(env);
  mockEnv.DB = env.DB;
  mockEnv.FLAGS_KV = env.FLAGS_KV;
});

async function createEvent(name = "page_view") {
  const res = await POST(req("POST", "/api/admin/events", { name }));
  expect(res.status).toBe(201);
  return res.json() as Promise<{ id: string; name: string }>;
}

describe("GET /admin/events", () => {
  it("returns empty list initially", async () => {
    expect(await (await GET(req("GET", "/api/admin/events"))).json()).toEqual([]);
  });

  it("lists events", async () => {
    await createEvent("click");
    await createEvent("view");
    const body = (await (await GET(req("GET", "/api/admin/events"))).json()) as { name: string }[];
    expect(body.map((e) => e.name).sort()).toEqual(["click", "view"]);
  });
});

describe("POST /admin/events", () => {
  it("creates an event (201)", async () => {
    const res = await POST(
      req("POST", "/api/admin/events", { name: "purchase", description: "User buys" }),
    );
    expect(res.status).toBe(201);
    expect(((await res.json()) as { name: string }).name).toBe("purchase");
  });

  it("returns 409 for duplicate name", async () => {
    await createEvent("dup");
    expect((await POST(req("POST", "/api/admin/events", { name: "dup" }))).status).toBe(409);
  });

  it("returns 422 for invalid name", async () => {
    expect((await POST(req("POST", "/api/admin/events", { name: "123 invalid!" }))).status).toBe(
      422,
    );
  });

  it("writes catalog to KV", async () => {
    await createEvent("catalog_event");
    const kv = mockEnv.FLAGS_KV as unknown as MemoryKV;
    const catalog = JSON.parse(kv.store.get(`${TEST_PROJECT_ID}:catalog`)!);
    expect(catalog).toContain("catalog_event");
  });
});

describe("GET /admin/events/:id", () => {
  it("returns the event", async () => {
    const { id } = await createEvent("single");
    const res = await GET_ONE(req("GET", `/api/admin/events/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { name: string }).name).toBe("single");
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await GET_ONE(req("GET", "/api/admin/events/ghost"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("PATCH /admin/events/:id", () => {
  it("updates description", async () => {
    const { id } = await createEvent("patchable");
    expect(
      (
        await PATCH(req("PATCH", `/api/admin/events/${id}`, { description: "Updated" }), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await PATCH(req("PATCH", "/api/admin/events/ghost", { description: "x" }), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("POST /admin/events/:id/approve", () => {
  it("approves an event (sets pending=0)", async () => {
    const { id } = await createEvent("needs_approval");
    const res = await APPROVE(req("POST", `/api/admin/events/${id}/approve`, {}), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { pending: number }).pending).toBe(0);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await APPROVE(req("POST", "/api/admin/events/ghost/approve", {}), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("DELETE /admin/events/:id", () => {
  it("deletes the event", async () => {
    const { id } = await createEvent("bye");
    expect(
      (await DELETE(req("DELETE", `/api/admin/events/${id}`), { params: Promise.resolve({ id }) }))
        .status,
    ).toBe(200);
    expect(
      (await GET_ONE(req("GET", `/api/admin/events/${id}`), { params: Promise.resolve({ id }) }))
        .status,
    ).toBe(404);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await DELETE(req("DELETE", "/api/admin/events/ghost"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});
