// OpenAPI 3.0.3 spec for the public worker surface.
//
// Spec is intentionally pinned to 3.0 (not 3.1) because most server-side
// codegen tools — oapi-codegen (Go), openapi-generator (Java/PHP/Ruby/Python)
// — still don't support 3.1's `type: ["string", "null"]` and `const`. The TS
// generator (openapi-typescript) handles both happily.
//
// Hand-authored (not generated from Zod) because the SDK endpoints predate any
// validation schemas — handlers parse JSON ad-hoc. Treat this file as the
// contract source; if you change a route or its shape, update here and the
// matching handler in src/sdk/*.ts in the same commit.
//
// Consumers:
//   - openapi-generator-cli  → server-SDK transport stubs (Go, Java, PHP, Python, Ruby)
//   - openapi-typescript     → strongly-typed fetch in tests / scratch tooling
//   - Stoplight / Swagger UI → human-readable docs at /openapi.json
//
// What this spec deliberately does NOT cover:
//   - The local-evaluation logic (murmur3 + bucketing). That's per-language
//     hand-port; see experiment-platform/04-evaluation.md and 12-sdk-reference.md.
//   - /auth/device/* CLI flow — internal, not part of the SDK surface.

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "ShipEasy Worker API",
    version: "1.0.0",
    description:
      "Edge worker hot path for the ShipEasy feature-flag and experimentation platform. " +
      "Server SDKs poll /sdk/flags + /sdk/experiments and evaluate locally; client SDKs " +
      "POST to /sdk/evaluate; both emit events to /collect.",
  },
  servers: [{ url: "https://flags.yourdomain.com", description: "Production (replace host)" }],
  tags: [
    { name: "sdk-server", description: "Server SDK polling endpoints (server key)" },
    { name: "sdk-client", description: "Client SDK evaluation + ingestion (client key)" },
    { name: "ssr", description: "SSR bootstrap (server key)" },
  ],
  components: {
    securitySchemes: {
      sdkKey: {
        type: "apiKey",
        in: "header",
        name: "X-SDK-Key",
        description:
          "Project-scoped key. `server` keys grant access to /sdk/flags, /sdk/experiments, " +
          "/sdk/bootstrap. `client` keys grant access to /sdk/evaluate and /collect.",
      },
    },
    parameters: {
      EnvQuery: {
        name: "env",
        in: "query",
        required: false,
        description: "Target environment. Defaults to `production`.",
        schema: { type: "string", enum: ["development", "staging", "production"] },
      },
      IfNoneMatchHeader: {
        name: "If-None-Match",
        in: "header",
        required: false,
        description: "ETag from the previous successful response. Returns 304 on no change.",
        schema: { type: "string" },
      },
    },
    headers: {
      ETag: {
        description: "Opaque version tag for the KV blob.",
        schema: { type: "string" },
      },
      XPollInterval: {
        description: "Plan-driven recommended poll interval (seconds).",
        schema: { type: "integer", minimum: 1 },
      },
      XShipeasyEnv: {
        description: "Echo of the resolved environment.",
        schema: { type: "string" },
      },
    },
    schemas: {
      User: {
        type: "object",
        description:
          "Evaluation context. `user_id` (or `anonymous_id`) feeds the bucketing hash; " +
          "any other key is a targeting attribute referenced by gate rules.",
        additionalProperties: true,
        properties: {
          user_id: { type: "string" },
          anonymous_id: { type: "string" },
        },
      },
      GateRule: {
        type: "object",
        required: ["attr", "op", "value"],
        properties: {
          attr: { type: "string" },
          op: {
            type: "string",
            enum: ["eq", "neq", "in", "not_in", "gt", "gte", "lt", "lte", "contains", "regex"],
          },
          value: {},
        },
      },
      Gate: {
        type: "object",
        required: ["enabled", "rules", "rolloutPct", "salt"],
        properties: {
          enabled: { type: "boolean" },
          rules: { type: "array", items: { $ref: "#/components/schemas/GateRule" } },
          rolloutPct: {
            type: "integer",
            minimum: 0,
            maximum: 10000,
            description: "Basis points, 0–10000.",
          },
          salt: { type: "string" },
        },
      },
      Config: {
        type: "object",
        required: ["value"],
        properties: { value: {} },
      },
      ExperimentGroup: {
        type: "object",
        required: ["name", "weight", "params"],
        properties: {
          name: { type: "string" },
          weight: { type: "integer", minimum: 0, maximum: 10000 },
          params: { type: "object", additionalProperties: true },
        },
      },
      Experiment: {
        type: "object",
        required: ["universe", "allocationPct", "salt", "groups", "status"],
        properties: {
          universe: { type: "string" },
          targetingGate: { type: "string", nullable: true },
          allocationPct: { type: "integer", minimum: 0, maximum: 10000 },
          salt: { type: "string" },
          groups: {
            type: "array",
            items: { $ref: "#/components/schemas/ExperimentGroup" },
          },
          status: { type: "string", enum: ["draft", "running", "stopped", "archived"] },
          hashVersion: { type: "integer" },
        },
      },
      Universe: {
        type: "object",
        properties: {
          holdout_range: {
            type: "array",
            nullable: true,
            items: { type: "integer", minimum: 0, maximum: 10000 },
            minItems: 2,
            maxItems: 2,
          },
        },
      },
      ExperimentAssignment: {
        type: "object",
        required: ["group", "params", "inExperiment"],
        properties: {
          group: { type: "string" },
          params: { type: "object", additionalProperties: true },
          inExperiment: { type: "boolean" },
        },
      },
      FlagsBlob: {
        type: "object",
        required: ["version", "plan", "gates", "configs"],
        properties: {
          version: { type: "string" },
          plan: { type: "string", enum: ["free", "paid"] },
          gates: {
            type: "object",
            additionalProperties: { $ref: "#/components/schemas/Gate" },
          },
          configs: {
            type: "object",
            additionalProperties: { $ref: "#/components/schemas/Config" },
          },
        },
      },
      ExperimentsBlob: {
        type: "object",
        required: ["version", "experiments", "universes"],
        properties: {
          version: { type: "string" },
          experiments: {
            type: "object",
            additionalProperties: { $ref: "#/components/schemas/Experiment" },
          },
          universes: {
            type: "object",
            additionalProperties: { $ref: "#/components/schemas/Universe" },
          },
        },
      },
      EvaluateRequest: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          experiment_overrides: {
            type: "object",
            additionalProperties: { type: "string" },
            description: "Per-experiment forced group assignments. Bypasses the eval pipeline.",
          },
        },
      },
      EvaluateResult: {
        type: "object",
        required: ["flags", "configs", "experiments"],
        properties: {
          flags: { type: "object", additionalProperties: { type: "boolean" } },
          configs: { type: "object", additionalProperties: {} },
          experiments: {
            type: "object",
            additionalProperties: { $ref: "#/components/schemas/ExperimentAssignment" },
          },
          _attribute_warnings: {
            type: "object",
            additionalProperties: { type: "array", items: { type: "string" } },
          },
        },
      },
      BootstrapResult: {
        type: "object",
        required: ["flags", "configs", "experiments"],
        properties: {
          flags: { type: "object", additionalProperties: { type: "boolean" } },
          configs: { type: "object", additionalProperties: {} },
          experiments: {
            type: "object",
            additionalProperties: { $ref: "#/components/schemas/ExperimentAssignment" },
          },
        },
      },
      CollectExposure: {
        type: "object",
        required: ["type", "experiment", "group", "ts"],
        properties: {
          type: { type: "string", enum: ["exposure"] },
          experiment: { type: "string" },
          group: { type: "string" },
          user_id: { type: "string" },
          anonymous_id: { type: "string" },
          ts: { type: "integer", description: "Unix epoch milliseconds." },
        },
      },
      CollectMetric: {
        type: "object",
        required: ["type", "event_name", "ts"],
        properties: {
          type: { type: "string", enum: ["metric"] },
          event_name: { type: "string" },
          value: { type: "number" },
          user_id: { type: "string" },
          anonymous_id: { type: "string" },
          ts: { type: "integer" },
          properties: {
            type: "object",
            additionalProperties: true,
            maxProperties: 3,
            description:
              "Max 3 user properties — Analytics Engine schema is fixed; excess is rejected with 422.",
          },
        },
      },
      CollectIdentify: {
        type: "object",
        required: ["type", "user_id", "anonymous_id", "ts"],
        properties: {
          type: { type: "string", enum: ["identify"] },
          user_id: { type: "string" },
          anonymous_id: { type: "string" },
          ts: { type: "integer" },
        },
      },
      CollectRequest: {
        type: "object",
        required: ["events"],
        properties: {
          events: {
            type: "array",
            items: {
              oneOf: [
                { $ref: "#/components/schemas/CollectExposure" },
                { $ref: "#/components/schemas/CollectMetric" },
                { $ref: "#/components/schemas/CollectIdentify" },
              ],
            },
          },
        },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" },
          invalid: { type: "array", items: { type: "string" } },
          unregistered: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  security: [{ sdkKey: [] }],
  paths: {
    "/sdk/flags": {
      get: {
        operationId: "getFlags",
        tags: ["sdk-server"],
        summary: "Fetch gates + configs blob (server SDK polling)",
        description:
          "Returns the full gates + configs blob for local evaluation. Honors If-None-Match " +
          "for 304 responses. Cache-Control is `public, max-age=31536000` — invalidation is " +
          "via explicit CDN purge on writes.",
        parameters: [
          { $ref: "#/components/parameters/EnvQuery" },
          { $ref: "#/components/parameters/IfNoneMatchHeader" },
        ],
        responses: {
          "200": {
            description: "Current flags blob.",
            headers: {
              ETag: { $ref: "#/components/headers/ETag" },
              "X-Poll-Interval": { $ref: "#/components/headers/XPollInterval" },
              "X-Shipeasy-Env": { $ref: "#/components/headers/XShipeasyEnv" },
            },
            content: { "application/json": { schema: { $ref: "#/components/schemas/FlagsBlob" } } },
          },
          "304": {
            description: "Not modified. Reuse the cached blob.",
            headers: {
              ETag: { $ref: "#/components/headers/ETag" },
              "X-Poll-Interval": { $ref: "#/components/headers/XPollInterval" },
              "X-Shipeasy-Env": { $ref: "#/components/headers/XShipeasyEnv" },
            },
          },
          "401": {
            description: "Missing or invalid X-SDK-Key.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/sdk/experiments": {
      get: {
        operationId: "getExperiments",
        tags: ["sdk-server"],
        summary: "Fetch experiments + universes blob (server SDK polling)",
        parameters: [{ $ref: "#/components/parameters/IfNoneMatchHeader" }],
        responses: {
          "200": {
            description: "Current experiments blob.",
            headers: { ETag: { $ref: "#/components/headers/ETag" } },
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ExperimentsBlob" } },
            },
          },
          "304": {
            description: "Not modified.",
            headers: { ETag: { $ref: "#/components/headers/ETag" } },
          },
          "401": {
            description: "Missing or invalid X-SDK-Key.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/sdk/evaluate": {
      post: {
        operationId: "evaluate",
        tags: ["sdk-client"],
        summary: "Server-side evaluation for client SDKs",
        description:
          "Client SDKs that don't ship rules POST a user context here and receive a flat " +
          "map of evaluated flags, configs, and experiment assignments.",
        parameters: [{ $ref: "#/components/parameters/EnvQuery" }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EvaluateRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Evaluated payload for the supplied user context.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/EvaluateResult" } },
            },
          },
          "401": {
            description: "Missing or invalid X-SDK-Key.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/sdk/bootstrap": {
      get: {
        operationId: "bootstrap",
        tags: ["ssr"],
        summary: "SSR pre-evaluation for server components",
        description:
          "User context is supplied via base64-encoded JSON in the X-User-Context header so " +
          "edge caches can vary per-request without a body.",
        parameters: [
          { $ref: "#/components/parameters/EnvQuery" },
          {
            name: "X-User-Context",
            in: "header",
            required: false,
            description: "Base64-encoded JSON user context. Omit for anonymous evaluation.",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Evaluated payload.",
            headers: { ETag: { $ref: "#/components/headers/ETag" } },
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/BootstrapResult" } },
            },
          },
          "400": {
            description: "X-User-Context is not valid base64-encoded JSON.",
            content: { "text/plain": { schema: { type: "string" } } },
          },
          "401": {
            description: "Missing or invalid X-SDK-Key.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/collect": {
      post: {
        operationId: "collect",
        tags: ["sdk-client"],
        summary: "Event ingestion — exposures, metrics, identifies",
        description:
          "Fire-and-forget. Returns 202 on success, 422 on unknown experiment or unregistered " +
          "metric event. Note: the runtime endpoint also accepts `text/plain` (sendBeacon emits " +
          "text/plain to skip CORS preflight on mobile Safari); the spec only documents " +
          "application/json because most generators model multi-content endpoints poorly — " +
          "clients can override Content-Type at the transport layer when beaconing.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CollectRequest" } },
          },
        },
        responses: {
          "202": { description: "Accepted." },
          "400": {
            description: "Invalid JSON body.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "422": {
            description:
              "Validation error: unknown experiment, unregistered metric, or bad payload.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "401": {
            description: "Missing or invalid X-SDK-Key.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
  },
} as const;
