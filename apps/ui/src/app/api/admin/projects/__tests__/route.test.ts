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

import { GET, PATCH } from "../[id]/route";
import { PATCH as UPDATE_PLAN } from "../[id]/plan/route";
import { GET as GET_STORAGE } from "../[id]/storage/route";

beforeEach(async () => {
  const env = createTestEnv();
  await seedProject(env);
  mockEnv.DB = env.DB;
  mockEnv.FLAGS_KV = env.FLAGS_KV;
});

const ID = TEST_PROJECT_ID;
const p = (id = ID) => ({ params: Promise.resolve({ id }) });

describe("GET /admin/projects/:id", () => {
  it("returns the project", async () => {
    const res = await GET(req("GET", `/api/admin/projects/${ID}`), p());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; plan: string };
    expect(body.id).toBe(ID);
    expect(body.plan).toBe("free");
  });

  it("returns 403 if id doesn't match session project", async () => {
    const res = await GET(req("GET", "/api/admin/projects/other"), p("other"));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /admin/projects/:id", () => {
  it("updates name", async () => {
    const res = await PATCH(req("PATCH", `/api/admin/projects/${ID}`, { name: "New Name" }), p());
    expect(res.status).toBe(200);
    expect(((await res.json()) as { name: string }).name).toBe("New Name");
  });

  it("returns 403 for different project id", async () => {
    expect(
      (await PATCH(req("PATCH", "/api/admin/projects/other", { name: "x" }), p("other"))).status,
    ).toBe(403);
  });

  it("returns 422 for empty name", async () => {
    expect((await PATCH(req("PATCH", `/api/admin/projects/${ID}`, { name: "" }), p())).status).toBe(
      422,
    );
  });
});

describe("PATCH /admin/projects/:id/plan", () => {
  it("upgrades plan and triggers KV rebuild", async () => {
    const res = await UPDATE_PLAN(
      req("PATCH", `/api/admin/projects/${ID}/plan`, { plan: "paid" }),
      p(),
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { plan: string }).plan).toBe("paid");
  });

  it("returns 422 for invalid plan", async () => {
    expect(
      (await UPDATE_PLAN(req("PATCH", `/api/admin/projects/${ID}/plan`, { plan: "ultra" }), p()))
        .status,
    ).toBe(422);
  });

  it("returns 403 for different project id", async () => {
    expect(
      (
        await UPDATE_PLAN(
          req("PATCH", "/api/admin/projects/other/plan", { plan: "pro" }),
          p("other"),
        )
      ).status,
    ).toBe(403);
  });
});

describe("GET /admin/projects/:id/storage", () => {
  it("returns storage counts", async () => {
    const res = await GET_STORAGE(req("GET", `/api/admin/projects/${ID}/storage`), p());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { counts: Record<string, number> };
    expect(body.counts).toMatchObject({
      gates: 0,
      configs: 0,
      experiments: 0,
    });
  });

  it("returns 403 for different project id", async () => {
    expect(
      (await GET_STORAGE(req("GET", "/api/admin/projects/other/storage"), p("other"))).status,
    ).toBe(403);
  });
});
