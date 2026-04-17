// Minimal subset of the Cloudflare bindings shared by the admin code paths.
// Consumers may extend this with their own runtime-specific bindings.

export interface CoreEnv {
  DB: D1Database;
  FLAGS_KV?: KVNamespace;
  CF_ZONE_ID?: string;
  CF_API_TOKEN?: string;
  FLAGS_DOMAIN?: string;
}
