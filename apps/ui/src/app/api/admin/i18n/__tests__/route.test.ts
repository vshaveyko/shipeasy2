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

import { GET as LIST_PROFILES, POST as CREATE_PROFILE } from "../profiles/route";
import { DELETE as DELETE_PROFILE } from "../profiles/[id]/route";
import { GET as LIST_KEYS, POST as UPSERT_KEYS } from "../keys/route";
import { PUT as UPDATE_KEY, DELETE as DELETE_KEY } from "../keys/[id]/route";
import { GET as LIST_DRAFTS, POST as CREATE_DRAFT } from "../drafts/route";
import { PUT as UPDATE_DRAFT, DELETE as DELETE_DRAFT } from "../drafts/[id]/route";

beforeEach(async () => {
  const env = createTestEnv();
  await seedProject(env);
  mockEnv.DB = env.DB;
  mockEnv.FLAGS_KV = env.FLAGS_KV;
});

async function createProfile(name = "en") {
  const res = await CREATE_PROFILE(req("POST", "/api/admin/i18n/profiles", { name }));
  expect(res.status).toBe(201);
  return res.json() as Promise<{ id: string; name: string }>;
}

// ── Profiles ─────────────────────────────────────────────────────────────────

describe("GET /admin/i18n/profiles", () => {
  it("returns empty list initially", async () => {
    expect(await (await LIST_PROFILES(req("GET", "/api/admin/i18n/profiles"))).json()).toEqual([]);
  });

  it("lists created profiles", async () => {
    await createProfile("en");
    await createProfile("fr");
    const body = (await (await LIST_PROFILES(req("GET", "/api/admin/i18n/profiles"))).json()) as {
      name: string;
    }[];
    expect(body.map((p) => p.name).sort()).toEqual(["en", "fr"]);
  });
});

describe("POST /admin/i18n/profiles", () => {
  it("creates a profile (201)", async () => {
    const res = await CREATE_PROFILE(req("POST", "/api/admin/i18n/profiles", { name: "de" }));
    expect(res.status).toBe(201);
    expect(((await res.json()) as { name: string }).name).toBe("de");
  });

  it("returns 409 for duplicate name", async () => {
    await createProfile("dup");
    expect(
      (await CREATE_PROFILE(req("POST", "/api/admin/i18n/profiles", { name: "dup" }))).status,
    ).toBe(409);
  });

  it("returns 422 for invalid name (uppercase)", async () => {
    expect(
      (await CREATE_PROFILE(req("POST", "/api/admin/i18n/profiles", { name: "EN" }))).status,
    ).toBe(422);
  });
});

describe("DELETE /admin/i18n/profiles/:id", () => {
  it("deletes a profile", async () => {
    const { id } = await createProfile("bye");
    expect(
      (
        await DELETE_PROFILE(req("DELETE", `/api/admin/i18n/profiles/${id}`), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(200);
    const list = (await (await LIST_PROFILES(req("GET", "/api/admin/i18n/profiles"))).json()) as {
      id: string;
    }[];
    expect(list.find((p) => p.id === id)).toBeUndefined();
  });

  it("returns 404 for unknown id", async () => {
    expect(
      (
        await DELETE_PROFILE(req("DELETE", "/api/admin/i18n/profiles/ghost"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

// ── Keys ──────────────────────────────────────────────────────────────────────

async function upsertKeys(profileId: string, keys = [{ key: "hello", value: "Hello" }]) {
  const res = await UPSERT_KEYS(
    req("POST", "/api/admin/i18n/keys", { profile_id: profileId, chunk: "default", keys }),
  );
  expect(res.status).toBe(201);
  return res.json() as Promise<{ upserted: number }>;
}

describe("GET /admin/i18n/keys", () => {
  it("returns empty list initially", async () => {
    expect(await (await LIST_KEYS(req("GET", "/api/admin/i18n/keys"))).json()).toEqual([]);
  });

  it("lists keys for a profile", async () => {
    const { id } = await createProfile("en");
    await upsertKeys(id, [
      { key: "greeting", value: "Hello" },
      { key: "farewell", value: "Goodbye" },
    ]);
    const url = `http://localhost/api/admin/i18n/keys?profile_id=${id}`;
    const body = (await (await LIST_KEYS(new Request(url))).json()) as { key: string }[];
    expect(body.map((k) => k.key).sort()).toEqual(["farewell", "greeting"]);
  });
});

describe("POST /admin/i18n/keys (upsert)", () => {
  it("inserts keys (201)", async () => {
    const { id } = await createProfile("en");
    const body = await upsertKeys(id);
    expect(body.upserted).toBe(1);
  });

  it("updates existing keys on conflict", async () => {
    const { id } = await createProfile("en");
    await upsertKeys(id, [{ key: "hi", value: "Hello" }]);
    const body = await upsertKeys(id, [{ key: "hi", value: "Hi there" }]);
    expect(body.upserted).toBe(1);
    const url = `http://localhost/api/admin/i18n/keys?profile_id=${id}`;
    const list = (await (await LIST_KEYS(new Request(url))).json()) as {
      key: string;
      value: string;
    }[];
    expect(list.find((k) => k.key === "hi")?.value).toBe("Hi there");
  });

  it("returns 404 for unknown profile_id", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await UPSERT_KEYS(
      req("POST", "/api/admin/i18n/keys", {
        profile_id: fakeId,
        chunk: "default",
        keys: [{ key: "x", value: "y" }],
      }),
    );
    expect(res.status).toBe(404);
  });
});

describe("PUT /admin/i18n/keys/:id", () => {
  it("updates a key value", async () => {
    const { id: profileId } = await createProfile("en");
    await upsertKeys(profileId, [{ key: "btn", value: "Click" }]);
    const url = `http://localhost/api/admin/i18n/keys?profile_id=${profileId}`;
    const list = (await (await LIST_KEYS(new Request(url))).json()) as { id: string }[];
    const keyId = list[0].id;

    const res = await UPDATE_KEY(req("PUT", `/api/admin/i18n/keys/${keyId}`, { value: "Tap" }), {
      params: Promise.resolve({ id: keyId }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown key id", async () => {
    expect(
      (
        await UPDATE_KEY(req("PUT", "/api/admin/i18n/keys/ghost", { value: "x" }), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("DELETE /admin/i18n/keys/:id", () => {
  it("deletes a key", async () => {
    const { id: profileId } = await createProfile("en");
    await upsertKeys(profileId, [{ key: "bye", value: "Bye" }]);
    const url = `http://localhost/api/admin/i18n/keys?profile_id=${profileId}`;
    const list = (await (await LIST_KEYS(new Request(url))).json()) as { id: string }[];
    const keyId = list[0].id;

    expect(
      (
        await DELETE_KEY(req("DELETE", `/api/admin/i18n/keys/${keyId}`), {
          params: Promise.resolve({ id: keyId }),
        })
      ).status,
    ).toBe(200);
  });

  it("returns 404 for unknown key id", async () => {
    expect(
      (
        await DELETE_KEY(req("DELETE", "/api/admin/i18n/keys/ghost"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

// ── Drafts ────────────────────────────────────────────────────────────────────

async function createDraft(profileId: string, name = "v2") {
  const res = await CREATE_DRAFT(
    req("POST", "/api/admin/i18n/drafts", { profile_id: profileId, name }),
  );
  expect(res.status).toBe(201);
  return res.json() as Promise<{ id: string; name: string }>;
}

describe("GET /admin/i18n/drafts", () => {
  it("returns empty list initially", async () => {
    expect(await (await LIST_DRAFTS(req("GET", "/api/admin/i18n/drafts"))).json()).toEqual([]);
  });

  it("lists drafts for a profile", async () => {
    const { id } = await createProfile("en");
    await createDraft(id, "draft-a");
    await createDraft(id, "draft-b");
    const url = `http://localhost/api/admin/i18n/drafts?profile_id=${id}`;
    const body = (await (await LIST_DRAFTS(new Request(url))).json()) as { name: string }[];
    expect(body.map((d) => d.name).sort()).toEqual(["draft-a", "draft-b"]);
  });
});

describe("POST /admin/i18n/drafts", () => {
  it("creates a draft (201)", async () => {
    const { id } = await createProfile("en");
    expect((await createDraft(id)).name).toBe("v2");
  });

  it("returns 409 for duplicate draft name", async () => {
    const { id } = await createProfile("en");
    await createDraft(id, "dup");
    expect(
      (await CREATE_DRAFT(req("POST", "/api/admin/i18n/drafts", { profile_id: id, name: "dup" })))
        .status,
    ).toBe(409);
  });

  it("returns 404 for unknown profile_id", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    expect(
      (await CREATE_DRAFT(req("POST", "/api/admin/i18n/drafts", { profile_id: fakeId, name: "x" })))
        .status,
    ).toBe(404);
  });
});

describe("PUT /admin/i18n/drafts/:id", () => {
  it("updates draft status to abandoned", async () => {
    const { id: profileId } = await createProfile("en");
    const { id } = await createDraft(profileId, "to-abandon");
    expect(
      (
        await UPDATE_DRAFT(req("PUT", `/api/admin/i18n/drafts/${id}`, { status: "abandoned" }), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(200);
  });

  it("returns 404 for unknown draft id", async () => {
    expect(
      (
        await UPDATE_DRAFT(req("PUT", "/api/admin/i18n/drafts/ghost", { status: "open" }), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("DELETE /admin/i18n/drafts/:id", () => {
  it("deletes a draft", async () => {
    const { id: profileId } = await createProfile("en");
    const { id } = await createDraft(profileId, "bye-draft");
    expect(
      (
        await DELETE_DRAFT(req("DELETE", `/api/admin/i18n/drafts/${id}`), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(200);
  });

  it("returns 404 for unknown draft id", async () => {
    expect(
      (
        await DELETE_DRAFT(req("DELETE", "/api/admin/i18n/drafts/ghost"), {
          params: Promise.resolve({ id: "ghost" }),
        })
      ).status,
    ).toBe(404);
  });
});
