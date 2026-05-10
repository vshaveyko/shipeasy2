import { z } from "zod";
import {
  gateCreateSchema,
  gateUpdateSchema,
  gateResponseSchema,
  gateCreateResponseSchema,
  gateUpdateResponseSchema,
  gateDeleteResponseSchema,
  gateToggleResponseSchema,
  type GateCreateInput,
  type GateUpdateInput,
} from "@shipeasy/core/schemas/gates";
import type { Page, PageQuery } from "@shipeasy/core/pagination";
import type { Transport } from "../transport.js";
import { ApiError } from "../transport.js";

// Reusable page envelope for the gate list endpoint. Built from the gate
// response schema so the OpenAPI generator emits it as `ListGatesResponse`.
const gateListResponseSchema = z.object({
  data: z.array(gateResponseSchema),
  next_cursor: z.string().nullable(),
});

/** Gate row as returned by `GET /api/admin/gates`. Booleans come back as 0/1 from D1. */
export interface Gate {
  id: string;
  name: string;
  enabled: number | boolean;
  rolloutPct: number;
  rules?: unknown[];
  salt?: string;
  updatedAt: string;
}

export interface GatesClient {
  /** Single page of gates ordered `(updated_at desc, id desc)`. */
  list(opts?: Partial<PageQuery>): Promise<Page<Gate>>;
  /** Drain every page. Use for small datasets or batch CLI jobs. */
  listAll(): Promise<Gate[]>;
  /** Server has no GET /:id endpoint — resolved by paging through and filtering. */
  getByName(name: string): Promise<Gate>;
  /** Same as getByName but accepts either `id` or `name` (id wins if both match). */
  resolve(idOrName: string): Promise<Gate>;
  create(input: GateCreateInput): Promise<{ id: string; name: string }>;
  update(id: string, input: GateUpdateInput): Promise<{ id: string }>;
  delete(id: string): Promise<{ ok: true }>;
  enable(id: string): Promise<{ id: string; enabled: boolean }>;
  disable(id: string): Promise<{ id: string; enabled: boolean }>;
  /** Convenience: resolve by name, then PATCH rollout_pct. `pct` is 0–100 (decimals OK). */
  setRollout(name: string, pct: number): Promise<{ id: string }>;
}

const BASE = "/api/admin/gates";

export function gatesClient(t: Transport): GatesClient {
  async function list(opts: Partial<PageQuery> = {}): Promise<Page<Gate>> {
    const query: Record<string, string> = {};
    if (opts.limit !== undefined) query.limit = String(opts.limit);
    if (opts.cursor) query.cursor = opts.cursor;
    return t.request<Page<Gate>>("GET", BASE, undefined, query);
  }

  async function listAll(): Promise<Gate[]> {
    const out: Gate[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ limit: 500, cursor });
      out.push(...page.data);
      cursor = page.next_cursor ?? undefined;
    } while (cursor);
    return out;
  }

  async function resolve(idOrName: string): Promise<Gate> {
    const all = await listAll();
    const found = all.find((g) => g.id === idOrName) ?? all.find((g) => g.name === idOrName);
    if (!found) throw new ApiError(`Gate '${idOrName}' not found`, 404);
    return found;
  }

  return {
    list,
    listAll,
    resolve,
    getByName: async (name: string) => {
      const found = (await listAll()).find((g) => g.name === name);
      if (!found) throw new ApiError(`Gate '${name}' not found`, 404);
      return found;
    },
    create: (input: GateCreateInput) =>
      t.request<{ id: string; name: string }>("POST", BASE, gateCreateSchema.parse(input)),
    update: (id: string, input: GateUpdateInput) =>
      t.request<{ id: string }>("PATCH", `${BASE}/${id}`, gateUpdateSchema.parse(input)),
    delete: (id: string) => t.request<{ ok: true }>("DELETE", `${BASE}/${id}`),
    enable: (id: string) =>
      t.request<{ id: string; enabled: boolean }>("POST", `${BASE}/${id}/enable`),
    disable: (id: string) =>
      t.request<{ id: string; enabled: boolean }>("POST", `${BASE}/${id}/disable`),
    setRollout: async (name: string, pct: number) => {
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new ApiError("rollout must be a number between 0 and 100", 400);
      }
      const gate = await resolve(name);
      return t.request<{ id: string }>("PATCH", `${BASE}/${gate.id}`, {
        rollout_pct: Math.round(pct * 100),
      });
    },
  };
}

/**
 * Resource descriptor for the registry. MCP iterates this to auto-generate
 * its tool catalog; CLI iterates it to auto-wire commander subcommands.
 *
 * `inputSchema` fields are zod schemas — convert with `z.toJSONSchema()` for
 * MCP `inputSchema` JSON Schema, parse directly for CLI option validation.
 */
export const gatesResource = {
  name: "gates" as const,
  basePath: BASE,
  describeOne: "feature gate",
  describeMany: "feature gates",
  tag: {
    name: "Gates",
    description:
      "Feature gates: boolean flags evaluated at runtime against project rules + a percentage rollout. Each gate is keyed by a stable `name`; flip `enabled`, ramp `rollout_pct`, or attach targeting `rules` to control exposure.",
  },
  schemas: {
    create: gateCreateSchema,
    update: gateUpdateSchema,
  },
  /** Custom action endpoints beyond CRUD (POST <basePath>/:id/<action>). */
  actions: [
    { name: "enable", description: "Enable a gate" },
    { name: "disable", description: "Disable a gate" },
  ] as const,
  /**
   * Full operation list for the OpenAPI doc. Order here is the order shown in
   * the docs sidebar. The typed client (`gatesClient`) is the runtime contract;
   * this is the documented surface.
   */
  endpoints: [
    {
      operationId: "listGates",
      method: "GET",
      path: "",
      summary: "List feature gates",
      description:
        "Returns a single page of gates ordered by `updated_at desc, id desc`. Use the `cursor` query parameter to paginate.",
      response: gateListResponseSchema,
      examples: {
        response: {
          data: [
            {
              id: "gat_01j7w7m9q4hxbf6npe6s9zr3vc",
              name: "checkout_v2",
              enabled: 1,
              rolloutPct: 5000,
              rules: [],
              updatedAt: "2026-05-09T16:01:22.000Z",
            },
          ],
          next_cursor: null,
        },
      },
      useCase:
        "Snapshot every gate in the project — for example to render an admin overview or to drive a CI check that asserts no gate is left at 100% in staging.",
    },
    {
      operationId: "createGate",
      method: "POST",
      path: "",
      summary: "Create a feature gate",
      description: "Creates a new gate, defaulting to enabled at the supplied rollout.",
      successStatus: 201,
      request: gateCreateSchema,
      response: gateCreateResponseSchema,
      examples: {
        request: { name: "checkout_v2", rollout_pct: 0 },
        response: { id: "gat_01j7w7m9q4hxbf6npe6s9zr3vc", name: "checkout_v2" },
      },
      useCase:
        "Create the gate at 0% rollout from your release pipeline, then ramp it via PATCH once you've validated the rollout in production.",
    },
    {
      operationId: "updateGate",
      method: "PATCH",
      path: "/{id}",
      summary: "Update a feature gate",
      description:
        "Partial update — only the supplied fields change. `rollout_pct` is in basis points (0–10000 = 0%–100%).",
      pathParams: { id: "Stable opaque gate id (`gat_…`)." },
      request: gateUpdateSchema,
      response: gateUpdateResponseSchema,
      examples: {
        request: { rollout_pct: 5000 },
        response: { id: "gat_01j7w7m9q4hxbf6npe6s9zr3vc" },
      },
      useCase: "Ramp a gate from 0 → 50 → 100% across deploy gates in your CI.",
    },
    {
      operationId: "deleteGate",
      method: "DELETE",
      path: "/{id}",
      summary: "Delete a feature gate",
      description:
        "Soft-deletes the gate. Returns 409 if the gate is still referenced by a running experiment as a targeting gate — stop the experiment first.",
      pathParams: { id: "Stable opaque gate id (`gat_…`)." },
      response: gateDeleteResponseSchema,
      examples: { response: { ok: true } },
      useCase:
        "Tear down a gate after a feature has fully shipped and the rollout flag is no longer needed.",
    },
    {
      operationId: "enableGate",
      method: "POST",
      path: "/{id}/enable",
      summary: "Enable a gate",
      description: "Sets `enabled: true`. The current `rollout_pct` is preserved.",
      pathParams: { id: "Stable opaque gate id." },
      response: gateToggleResponseSchema,
      examples: { response: { id: "gat_01j7w7m9q4hxbf6npe6s9zr3vc", enabled: true } },
      useCase: "Re-enable a previously disabled gate without re-issuing a full update.",
    },
    {
      operationId: "disableGate",
      method: "POST",
      path: "/{id}/disable",
      summary: "Disable a gate",
      description:
        "Sets `enabled: false` so the gate evaluates to `false` for every caller, regardless of `rollout_pct` or `rules`. Use as a quick kill switch.",
      pathParams: { id: "Stable opaque gate id." },
      response: gateToggleResponseSchema,
      examples: { response: { id: "gat_01j7w7m9q4hxbf6npe6s9zr3vc", enabled: false } },
      useCase:
        "Flip a gate off in production without redeploying — the canonical kill-switch flow.",
    },
  ] as const,
} as const;

export type { GateCreateInput, GateUpdateInput };
