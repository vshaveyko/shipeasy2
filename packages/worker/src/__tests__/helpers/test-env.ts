// Assembles a fully-wired test environment:
//   - in-memory SQLite as D1
//   - Map-backed KV for FLAGS_KV
//   - no-op stubs for Analytics Engine, R2, queues
//
// Also provisions a project row, a server key, and a client key so tests can
// call app.fetch() with a valid X-SDK-Key header immediately.

import { sha256 } from "@shipeasy/core";
import { makeInMemoryD1 } from "./d1-shim";
import { makeKv } from "./kv-mock";
import type { WorkerEnv } from "../../env";

// ── Analytics Engine stub ─────────────────────────────────────────────────────

function makeAe(): AnalyticsEngineDataset {
  return { writeDataPoint: () => {} } as unknown as AnalyticsEngineDataset;
}

// ── R2 stub ───────────────────────────────────────────────────────────────────

function makeR2(): R2Bucket {
  const store = new Map<string, Uint8Array>();
  return {
    async get(key: string) {
      const data = store.get(key);
      if (!data) return null;
      return {
        arrayBuffer: async () => data.buffer,
        text: async () => new TextDecoder().decode(data),
        body: null,
        bodyUsed: false,
      } as unknown as R2ObjectBody;
    },
    async put(key: string, value: ArrayBuffer | ArrayBufferView | string | ReadableStream | Blob) {
      const bytes =
        typeof value === "string"
          ? new TextEncoder().encode(value)
          : new Uint8Array(value as ArrayBuffer);
      store.set(key, bytes);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async head(key: string) {
      return store.has(key) ? ({} as R2Object) : null;
    },
    async list() {
      return { objects: [], truncated: false, delimitedPrefixes: [] };
    },
    async createMultipartUpload() {
      throw new Error("not implemented");
    },
    async resumeMultipartUpload() {
      throw new Error("not implemented");
    },
  } as unknown as R2Bucket;
}

// ── Queue stub ────────────────────────────────────────────────────────────────

function makeQueue<T>(): Queue<T> {
  return { send: async () => {}, sendBatch: async () => {} } as unknown as Queue<T>;
}

// ── Main factory ──────────────────────────────────────────────────────────────

export interface TestEnv {
  env: WorkerEnv;
  projectId: string;
  serverKey: string;
  clientKey: string;
}

let counter = 0;

export async function makeTestEnv(): Promise<TestEnv> {
  const { d1, sqlite } = makeInMemoryD1();
  const { kv } = makeKv();

  const projectId = `test-proj-${Date.now()}-${++counter}`;
  const now = new Date().toISOString();

  // Seed project row (needed so Drizzle FK refs don't blow up if enabled).
  sqlite
    .prepare(
      "INSERT INTO projects (id, name, owner_email, plan, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(projectId, "Test Project", `test-${counter}@e2e.test`, "free", "active", now, now);

  // Also seed the default universe (rebuildExperiments needs at least this).
  sqlite
    .prepare(
      "INSERT INTO universes (id, project_id, name, unit_type, holdout_range, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(`univ-${counter}`, projectId, "default", "user_id", null, now);

  // Provision SDK keys: generate raw strings, hash them, store both in KV.
  const serverKeyRaw = `sdk_server_test_${projectId}`;
  const clientKeyRaw = `sdk_client_test_${projectId}`;

  const serverHash = await sha256(serverKeyRaw);
  const clientHash = await sha256(clientKeyRaw);

  await kv.put(`sdk_key:${serverHash}`, JSON.stringify({ project_id: projectId, type: "server" }));
  await kv.put(`sdk_key:${clientHash}`, JSON.stringify({ project_id: projectId, type: "client" }));

  const env: WorkerEnv = {
    DB: d1,
    FLAGS_KV: kv,
    CLI_TOKEN_KV: undefined,
    EXPOSURES: makeAe(),
    METRIC_EVENTS: makeAe(),
    I18N_REQUESTS: makeAe(),
    ANALYSIS_QUEUE: makeQueue(),
    I18N_USAGE_QUEUE: makeQueue(),
    EVENTS_R2: makeR2(),
    LABELS_R2: makeR2(),
    // No CF credentials → purgeCache() no-ops.
    CF_ACCOUNT_ID: undefined,
    CF_API_TOKEN: undefined,
    CF_ZONE_ID: undefined,
    FLAGS_DOMAIN: undefined,
    ANALYTICS_HOST: undefined,
    CRONITOR_HEARTBEAT_URL: undefined,
    CLI_SERVICE_SECRET: undefined,
  };

  return { env, projectId, serverKey: serverKeyRaw, clientKey: clientKeyRaw };
}
