// In-memory KVNamespace mock backed by a plain Map.
// Covers get / put / delete / list.

export interface KvStore {
  store: Map<string, string>;
  kv: KVNamespace;
}

export function makeKv(): KvStore {
  const store = new Map<string, string>();

  const kv: KVNamespace = {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream) {
      store.set(key, typeof value === "string" ? value : String(value));
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list(options?: { prefix?: string; limit?: number; cursor?: string }) {
      const prefix = options?.prefix ?? "";
      const keys = [...store.keys()]
        .filter((k) => k.startsWith(prefix))
        .slice(0, options?.limit ?? 1000)
        .map((name) => ({ name, expiration: undefined, metadata: undefined }));
      return {
        keys,
        list_complete: true,
        cursor: undefined,
        cacheStatus: null,
      } as KVNamespaceListResult<unknown, string>;
    },
    async getWithMetadata<M = unknown>(key: string) {
      const value = store.get(key) ?? null;
      return { value, metadata: null as M };
    },
  } as unknown as KVNamespace;

  return { store, kv };
}
