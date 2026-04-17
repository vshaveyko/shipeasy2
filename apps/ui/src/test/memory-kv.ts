export class MemoryKV {
  readonly store = new Map<string, string>();

  async put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    _options?: { expirationTtl?: number; expiration?: number },
  ): Promise<void> {
    this.store.set(key, typeof value === "string" ? value : "");
  }

  async get(key: string): Promise<string | null>;
  async get(key: string, type: "text"): Promise<string | null>;
  async get(key: string, type: "json"): Promise<unknown>;
  async get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  async get(key: string, type: "stream"): Promise<ReadableStream | null>;
  async get(key: string, _type?: string): Promise<unknown> {
    return this.store.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<KVNamespaceListResult<unknown, string>> {
    let keys = [...this.store.keys()];
    if (options?.prefix) keys = keys.filter((k) => k.startsWith(options.prefix!));
    return {
      keys: keys.map((name) => ({ name, expiration: undefined, metadata: null })),
      list_complete: true,
      cacheStatus: null,
    };
  }

  async getWithMetadata<T = unknown>(
    key: string,
  ): Promise<KVNamespaceGetWithMetadataResult<string, T>> {
    return { value: this.store.get(key) ?? null, metadata: null, cacheStatus: null };
  }
}
