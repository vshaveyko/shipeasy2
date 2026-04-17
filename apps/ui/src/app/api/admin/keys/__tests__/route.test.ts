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
import { POST as REVOKE } from "../[id]/revoke/route";

beforeEach(async () => {
  const env = createTestEnv();
  await seedProject(env);
  mockEnv.DB = env.DB;
  mockEnv.FLAGS_KV = env.FLAGS_KV;
});

async function createKey(type: "server" | "client" | "admin" = "server") {
  const res = await POST(req("POST", "/api/admin/keys", { type }));
  expect(res.status).toBe(201);
  return res.json() as Promise<{ id: string; type: string; key: string }>;
}

describe("GET /admin/keys", () => {
  it("returns empty list initially", async () => {
    expect(await (await GET(req("GET", "/api/admin/keys"))).json()).toEqual([]);
  });

  it("lists created keys", async () => {
    await createKey("server");
    await createKey("client");
    const body = (await (await GET(req("GET", "/api/admin/keys"))).json()) as { type: string }[];
    expect(body.map((k) => k.type).sort()).toEqual(["client", "server"]);
  });
});

describe("POST /admin/keys", () => {
  it("creates a server key (201)", async () => {
    const res = await POST(req("POST", "/api/admin/keys", { type: "server" }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { key: string; type: string };
    expect(body.type).toBe("server");
    expect(body.key).toMatch(/^sdk_server_/);
  });

  it("creates a client key", async () => {
    const body = (await (
      await POST(req("POST", "/api/admin/keys", { type: "client" }))
    ).json()) as { key: string };
    expect(body.key).toMatch(/^sdk_client_/);
  });

  it("creates an admin key with expiry", async () => {
    const body = (await (await POST(req("POST", "/api/admin/keys", { type: "admin" }))).json()) as {
      expires_at: string | null;
    };
    expect(body.expires_at).not.toBeNull();
  });

  it("writes key entry to KV", async () => {
    await createKey("server");
    const kv = mockEnv.FLAGS_KV as unknown as MemoryKV;
    const entries = [...kv.store.keys()].filter((k) => k.startsWith("sdk_key:"));
    expect(entries.length).toBe(1);
  });

  it("returns 422 for invalid type", async () => {
    expect((await POST(req("POST", "/api/admin/keys", { type: "superadmin" }))).status).toBe(422);
  });
});

describe("POST /admin/keys/:id/revoke", () => {
  it("revokes an active key", async () => {
    const { id } = await createKey("server");
    const res = await REVOKE(req("POST", `/api/admin/keys/${id}/revoke`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { revoked: boolean }).revoked).toBe(true);

    // KV entry should be gone
    const kv = mockEnv.FLAGS_KV as unknown as MemoryKV;
    const entries = [...kv.store.keys()].filter((k) => k.startsWith("sdk_key:"));
    expect(entries.length).toBe(0);
  });

  it("is idempotent (revoking twice is safe)", async () => {
    const { id } = await createKey("client");
    await REVOKE(req("POST", `/api/admin/keys/${id}/revoke`), { params: Promise.resolve({ id }) });
    const res = await REVOKE(req("POST", `/api/admin/keys/${id}/revoke`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { revoked: boolean }).revoked).toBe(true);
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await REVOKE(req("POST", "/api/admin/keys/ghost/revoke"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});
