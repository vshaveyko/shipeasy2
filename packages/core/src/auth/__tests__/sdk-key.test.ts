import { beforeEach, describe, it, expect, vi } from "vitest";
import type { SdkKeyMeta } from "../sdk-key";

// Re-import the module fresh for each test to reset the module-level keyCache.
let validateSdkKey: (
  rawKey: string,
  expectedType: SdkKeyMeta["type"],
  kv: KVNamespace | undefined,
) => Promise<SdkKeyMeta | null>;

beforeEach(async () => {
  vi.resetModules();
  ({ validateSdkKey } = await import("../sdk-key"));
});

function makeMockKv(data: Record<string, string | null> = {}) {
  return {
    get: vi.fn(async (key: string) => data[key] ?? null),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

describe("validateSdkKey", () => {
  it("returns null when kv is undefined", async () => {
    expect(await validateSdkKey("any-key", "server", undefined)).toBeNull();
  });

  it("returns null when key is not found in KV", async () => {
    const kv = makeMockKv();
    expect(await validateSdkKey("missing-key-xyz", "server", kv)).toBeNull();
  });

  it("returns meta for a valid server key", async () => {
    const meta: SdkKeyMeta = { project_id: "proj-1", type: "server" };
    const kv = makeMockKv();
    // We don't know the sha256 of 'valid-server-key' ahead of time, so we intercept get
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (kv as any).get = vi.fn(async () => JSON.stringify(meta));

    const result = await validateSdkKey("valid-server-key-unique-1", "server", kv);
    expect(result).toEqual(meta);
  });

  it("returns null when key type does not match expected type", async () => {
    const meta: SdkKeyMeta = { project_id: "proj-2", type: "client" };
    const kv = makeMockKv();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (kv as any).get = vi.fn(async () => JSON.stringify(meta));

    const result = await validateSdkKey("client-key-unique-2", "server", kv);
    expect(result).toBeNull();
  });

  it("admin key is accepted for any expected type", async () => {
    const meta: SdkKeyMeta = { project_id: "proj-3", type: "admin" };
    const kv = makeMockKv();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (kv as any).get = vi.fn(async () => JSON.stringify(meta));

    expect(await validateSdkKey("admin-key-unique-3a", "server", kv)).toEqual(meta);

    vi.resetModules();
    ({ validateSdkKey } = await import("../sdk-key"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (kv as any).get = vi.fn(async () => JSON.stringify(meta));
    expect(await validateSdkKey("admin-key-unique-3b", "client", kv)).toEqual(meta);
  });

  it("returns null for an expired key", async () => {
    const meta: SdkKeyMeta = {
      project_id: "proj-4",
      type: "server",
      expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    const kv = makeMockKv();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (kv as any).get = vi.fn(async () => JSON.stringify(meta));

    expect(await validateSdkKey("expired-key-unique-4", "server", kv)).toBeNull();
  });

  it("returns meta for a key with a future expiry", async () => {
    const meta: SdkKeyMeta = {
      project_id: "proj-5",
      type: "server",
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    };
    const kv = makeMockKv();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (kv as any).get = vi.fn(async () => JSON.stringify(meta));

    expect(await validateSdkKey("future-expiry-key-unique-5", "server", kv)).toEqual(meta);
  });

  it("caches the result — KV is only called once for repeated lookups", async () => {
    const meta: SdkKeyMeta = { project_id: "proj-6", type: "server" };
    const kv = makeMockKv();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (kv as any).get = vi.fn(async () => JSON.stringify(meta));

    const raw = "cache-test-key-unique-6";
    await validateSdkKey(raw, "server", kv);
    await validateSdkKey(raw, "server", kv);

    expect(kv.get).toHaveBeenCalledTimes(1);
  });
});
